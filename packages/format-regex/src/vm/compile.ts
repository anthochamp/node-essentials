import {
	isAsciiAlphaNumeric,
	isAsciiDigit,
	isAsciiWhitespace,
} from "@ac-kit/core";

import type {
	AnyRegexNode,
	CharClassItem,
	RegexPattern,
	RegexQuantified,
	ShorthandClass,
} from "../ast.js";
import { DEFAULT_REGEX_LIMITS, RegexLimitExceededError } from "../limits.js";
import type { Instruction, RegexProgram } from "./program.js";

const isWordChar = (char: string): boolean =>
	isAsciiAlphaNumeric(char.charCodeAt(0)) || char === "_";

const SHORTHAND_PREDICATES: Readonly<
	Record<ShorthandClass, (char: string) => boolean>
> = {
	d: (char) => isAsciiDigit(char.charCodeAt(0)),
	D: (char) => !isAsciiDigit(char.charCodeAt(0)),
	w: isWordChar,
	W: (char) => !isWordChar(char),
	s: (char) => isAsciiWhitespace(char.charCodeAt(0)),
	S: (char) => !isAsciiWhitespace(char.charCodeAt(0)),
};

function compileCharClassPredicate(
	negated: boolean,
	items: readonly CharClassItem[],
): (char: string) => boolean {
	const singles = new Set<string>();
	const ranges: Array<{ readonly from: string; readonly to: string }> = [];
	const shorthands: ShorthandClass[] = [];
	for (const item of items) {
		if (item.kind === "char") singles.add(item.char);
		else if (item.kind === "range")
			ranges.push({ from: item.from, to: item.to });
		else shorthands.push(item.value);
	}

	const test = (char: string): boolean => {
		if (singles.has(char)) return true;
		for (const range of ranges) {
			if (char >= range.from && char <= range.to) return true;
		}
		for (const shorthand of shorthands) {
			if (SHORTHAND_PREDICATES[shorthand](char)) return true;
		}
		return false;
	};
	return negated ? (char) => !test(char) : test;
}

/**
 * Emits instructions and patches forward-jump targets once their destination is
 * known.
 */
class ProgramBuilder {
	private readonly instructions: Instruction[] = [];

	constructor(private readonly maxProgramSize: number) {}

	get length(): number {
		return this.instructions.length;
	}

	emit(instruction: Instruction): number {
		// Checked here rather than after building: a counted quantifier emits its
		// copies one at a time, so the array never grows past the bound.
		if (this.instructions.length >= this.maxProgramSize) {
			throw new RegexLimitExceededError("programSize", this.maxProgramSize);
		}
		this.instructions.push(instruction);
		return this.instructions.length - 1;
	}

	patchJmp(index: number, target: number): void {
		this.instructions[index] = { op: "jmp", target };
	}

	patchSplit(index: number, first: number, second: number): void {
		this.instructions[index] = { op: "split", first, second };
	}

	toInstructions(): readonly Instruction[] {
		return this.instructions;
	}
}

function compileNode(builder: ProgramBuilder, node: AnyRegexNode): void {
	switch (node.kind) {
		case "literal":
			builder.emit({ op: "char", char: node.char });
			return;
		case "any":
			builder.emit({ op: "any" });
			return;
		case "shorthand":
			builder.emit({
				op: "predicate",
				test: SHORTHAND_PREDICATES[node.value],
				label: `\\${node.value}`,
			});
			return;
		case "anchor":
			builder.emit(
				node.type === "start" ? { op: "assertStart" } : { op: "assertEnd" },
			);
			return;
		case "charClass": {
			const test = compileCharClassPredicate(node.negated, node.items);
			builder.emit({
				op: "predicate",
				test,
				label: node.negated ? "[^...]" : "[...]",
			});
			return;
		}
		case "group": {
			if (node.capturing) {
				const slot = node.index! * 2;
				builder.emit({ op: "save", slot });
				compileNode(builder, node.body);
				builder.emit({ op: "save", slot: slot + 1 });
			} else {
				compileNode(builder, node.body);
			}
			return;
		}
		case "concat":
			for (const item of node.items) compileNode(builder, item);
			return;
		case "alternation":
			compileAlternation(builder, node.alternatives);
			return;
		case "quantified":
			compileQuantified(builder, node);
			return;
	}
}

function compileAlternation(
	builder: ProgramBuilder,
	alternatives: readonly AnyRegexNode[],
): void {
	if (alternatives.length === 1) {
		compileNode(builder, alternatives[0]!);
		return;
	}
	// split first, second ; first: <alt0> ; jmp end ; second: <rest...> ; end:
	const splitIndex = builder.emit({ op: "split", first: -1, second: -1 });
	const firstStart = builder.length;
	compileNode(builder, alternatives[0]!);
	const jmpIndex = builder.emit({ op: "jmp", target: -1 });
	const secondStart = builder.length;
	builder.patchSplit(splitIndex, firstStart, secondStart);
	compileAlternation(builder, alternatives.slice(1));
	builder.patchJmp(jmpIndex, builder.length);
}

/**
 * `body*`/`body+`'s unbounded tail: `split top, end ; top: <body> ; jmp split ;
 * end:`.
 */
function compileStar(
	builder: ProgramBuilder,
	body: AnyRegexNode,
	lazy: boolean,
): void {
	const splitIndex = builder.emit({ op: "split", first: -1, second: -1 });
	const bodyStart = builder.length;
	compileNode(builder, body);
	builder.emit({ op: "jmp", target: splitIndex });
	const afterLoop = builder.length;
	// Greedy prefers repeating (bodyStart first); lazy prefers exiting (afterLoop first).
	if (lazy) builder.patchSplit(splitIndex, afterLoop, bodyStart);
	else builder.patchSplit(splitIndex, bodyStart, afterLoop);
}

/**
 * `count` nested optional copies of `body` — the bounded tail of `{min,max}`.
 *
 * Nesting means skipping copy _i_ also skips every copy after it, since they
 * are only reachable through copy _i_'s own body.
 */
function compileOptionalChain(
	builder: ProgramBuilder,
	body: AnyRegexNode,
	count: number,
	lazy: boolean,
): void {
	if (count === 0) return;
	const splitIndex = builder.emit({ op: "split", first: -1, second: -1 });
	const bodyStart = builder.length;
	compileNode(builder, body);
	compileOptionalChain(builder, body, count - 1, lazy);
	const afterAll = builder.length;
	if (lazy) builder.patchSplit(splitIndex, afterAll, bodyStart);
	else builder.patchSplit(splitIndex, bodyStart, afterAll);
}

function compileQuantified(
	builder: ProgramBuilder,
	node: RegexQuantified,
): void {
	const { body, min, max, lazy } = node;

	for (let i = 0; i < min; i++) compileNode(builder, body);

	if (max === undefined) {
		compileStar(builder, body, lazy);
	} else {
		compileOptionalChain(builder, body, max - min, lazy);
	}
}

/**
 * Compiles a parsed pattern to a {@link RegexProgram}.
 *
 * Every program embeds an unanchored left-to-right scan (`split <try match
 * here>, <consume one char and retry>`) so a single VM run finds the leftmost
 * match without the caller looping over start offsets. This always produces the
 * same result as scanning start offsets one at a time — it just folds the scan
 * into the bytecode instead — at the cost of not special-casing patterns that
 * open with `^` (those simply fail `assertStart` at every offset but 0, which
 * is correct, just not the fastest possible instruction count for that case).
 *
 * @param maxProgramSize - Most instructions the program may hold; see
 *   `RegexLimits.maxProgramSize`, whose default this takes.
 * @throws {RegexLimitExceededError} If the program outgrows `maxProgramSize`.
 */
export function compileProgram(
	pattern: RegexPattern,
	maxProgramSize: number = DEFAULT_REGEX_LIMITS.maxProgramSize,
): RegexProgram {
	const builder = new ProgramBuilder(maxProgramSize);

	const scanSplitIndex = builder.emit({ op: "split", first: -1, second: -1 });
	const tryStart = builder.length;
	builder.emit({ op: "save", slot: 0 });
	compileNode(builder, pattern.body);
	builder.emit({ op: "save", slot: 1 });
	builder.emit({ op: "match" });
	const consumeStart = builder.length;
	builder.emit({ op: "anyByte" });
	builder.emit({ op: "jmp", target: scanSplitIndex });
	builder.patchSplit(scanSplitIndex, tryStart, consumeStart);

	return {
		instructions: builder.toInstructions(),
		groupCount: pattern.groupCount,
	};
}
