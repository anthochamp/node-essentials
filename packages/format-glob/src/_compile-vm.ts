import { type RegexProgram, execProgram } from "@ac-kit/format-regex";

import {
	type CharSet,
	charSetOfChar,
	charSetOfChars,
	complementCharSet,
	expandCharSetCaseInsensitive,
	normalizeCharSet,
	unionCharSets,
} from "./_char-set.js";
import { collapseGlobstarRun, needsFloatingPrefix } from "./_glob-shape.js";
import { type NfaFragment, NfaBuilder } from "./_nfa.js";
import { posixClassCharSet } from "./_posix-class.js";
import type { GlobClassItem, GlobNode, GlobPattern } from "./ast.js";
import type { GlobFeatures } from "./dialect.js";
import { type GlobCompileBounds, GlobLimitExceededError } from "./limits.js";

const SLASH_ = charSetOfChar("/");
const NEWLINE_ = charSetOfChar("\n");
const PERIOD_ = charSetOfChar(".");
const DIGITS_ = charSetOfChars("0123456789");
const HYPHEN_ = charSetOfChar("-");

/** `[^/]` — what `*` and `?` consume when the dialect stops them at a segment. */
const NOT_SLASH_ = complementCharSet(SLASH_);

/** `.` in a native `RegExp`, which excludes a line terminator. */
const ANY_ = complementCharSet(NEWLINE_);

type BuildState = {
	readonly builder: NfaBuilder;
	readonly features: GlobFeatures;
	readonly bounds: GlobCompileBounds;
	/** Inclusive integer ranges, in capture-group order. */
	readonly ranges: { from: number; to: number }[];
	/** Whether the next node starts a path segment, for the leading-period rule. */
	atSegmentStart: boolean;
	/** Nesting depth of the extglob being built, if any. */
	extglobDepth: number;
};

/** The set a `*` consumes one character from. */
function starSet(state: BuildState): CharSet {
	return state.features.starCrossesSeparator ? ANY_ : NOT_SLASH_;
}

function literalCharSet(state: BuildState, char: string): CharSet {
	const set = charSetOfChar(char);
	return state.features.caseSensitive ? set : expandCharSetCaseInsensitive(set);
}

function classItemCharSet(item: GlobClassItem): CharSet {
	switch (item.kind) {
		case "char":
			return charSetOfChar(item.char);
		case "span":
			return normalizeCharSet([item.from.charCodeAt(0), item.to.charCodeAt(0)]);
		default:
			return posixClassCharSet(item.name);
	}
}

/**
 * The set one `[…]` accepts.
 *
 * Case folding happens before negation, because that is the order the `i` flag
 * imposes on a native `RegExp`: `/[^a]/i` rejects `A` as well as `a`.
 */
function classCharSet(
	state: BuildState,
	items: readonly GlobClassItem[],
	negated: boolean,
): CharSet {
	let members = unionCharSets(...items.map(classItemCharSet));
	if (!state.features.caseSensitive) {
		members = expandCharSetCaseInsensitive(members);
	}
	return negated ? complementCharSet(members) : members;
}

/** `-?[0-9]+`, with the digits saved into `slot` and `slot + 1`. */
function rangeCaptureFragment(state: BuildState, slot: number): NfaFragment {
	const { builder } = state;
	return builder.concatAll([
		builder.save(slot),
		builder.optional(builder.consume(HYPHEN_)),
		builder.plus(builder.consume(DIGITS_)),
		builder.save(slot + 1),
	]);
}

/**
 * `{from..to}` inside an extglob body, as real alternatives.
 *
 * A complement is taken over a language, not over a capture, so the
 * capture-and-check trick the rest of the compiler uses has nothing to attach
 * to here. Expanding is exact for the values in range, and bounded by
 * `maxRangeExpansion`; the leading-zero forms a capture would have equated
 * (`007` for `7`) are not equated by the expansion.
 */
function rangeExpansionFragment(
	state: BuildState,
	from: number,
	to: number,
): NfaFragment {
	const low = Math.min(from, to);
	const high = Math.max(from, to);
	if (high - low + 1 > state.bounds.maxRangeExpansion) {
		throw new GlobLimitExceededError(
			"rangeExpansion",
			state.bounds.maxRangeExpansion,
		);
	}
	const branches: NfaFragment[] = [];
	for (let value = low; value <= high; value++) {
		branches.push(literalFragment(state, String(value)));
	}
	return state.builder.alternate(branches);
}

function literalFragment(state: BuildState, text: string): NfaFragment {
	const { builder } = state;
	const chars: NfaFragment[] = [];
	// By code unit, not by code point: the VM and a native `RegExp` without the
	// `u` flag both step one code unit at a time, and an astral character has to
	// stay two of them for the two backends to agree.
	for (let index = 0; index < text.length; index++) {
		chars.push(builder.consume(literalCharSet(state, text[index]!)));
	}
	return builder.concatAll(chars);
}

/**
 * Builds the automaton for a node list, mirroring the native `RegExp` backend's
 * traversal node for node — including where it does and does not apply the
 * leading-period guard, since the two backends must answer identically.
 *
 * The right-to-left fold is what makes the guard exact: `(?!\.)` constrains the
 * first character of everything that follows, not only of the node it precedes,
 * so the guard has to be applied to the suffix automaton rather than to one
 * fragment.
 */
function buildNodes(
	nodes: readonly GlobNode[],
	state: BuildState,
): NfaFragment {
	const { builder } = state;
	const parts: { fragment: NfaFragment; guarded: boolean }[] = [];

	for (let index = 0; index < nodes.length; index++) {
		const node = nodes[index]!;
		const segmentStart = state.atSegmentStart;
		state.atSegmentStart = false;
		const guarded =
			state.features.periodMustBeExplicit &&
			segmentStart &&
			(node.kind === "any-char" ||
				node.kind === "star" ||
				node.kind === "class");

		switch (node.kind) {
			case "literal":
				parts.push({ fragment: literalFragment(state, node.text), guarded });
				break;
			case "separator":
				parts.push({ fragment: builder.consume(SLASH_), guarded });
				state.atSegmentStart = true;
				break;
			case "any-char":
				parts.push({ fragment: builder.consume(NOT_SLASH_), guarded });
				break;
			case "star":
				parts.push({
					fragment: builder.star(builder.consume(starSet(state))),
					guarded,
				});
				break;
			case "globstar": {
				const run = collapseGlobstarRun(nodes, index);
				const anyRun = builder.star(builder.consume(ANY_));
				parts.push({
					fragment: run.sawSeparator
						? builder.optional(builder.concat(anyRun, builder.consume(SLASH_)))
						: anyRun,
					guarded,
				});
				state.atSegmentStart = run.sawSeparator;
				index = run.end;
				break;
			}
			case "class":
				parts.push({
					fragment: builder.consume(
						classCharSet(state, node.items, node.negated),
					),
					guarded,
				});
				break;
			case "alternation":
				parts.push({
					fragment: builder.alternate(
						node.branches.map((branch) => buildNodes(branch, state)),
					),
					guarded,
				});
				break;
			case "extglob":
				parts.push({ fragment: buildExtglob(node, state), guarded });
				break;
			default:
				if (state.extglobDepth > 0) {
					parts.push({
						fragment: rangeExpansionFragment(state, node.from, node.to),
						guarded,
					});
					break;
				}
				state.ranges.push({ from: node.from, to: node.to });
				parts.push({
					fragment: rangeCaptureFragment(state, state.ranges.length * 2),
					guarded,
				});
				break;
		}
	}

	let suffix = builder.empty();
	for (let index = parts.length - 1; index >= 0; index--) {
		const part = parts[index]!;
		suffix = builder.concat(part.fragment, suffix);
		if (part.guarded) {
			suffix = builder.excludeFirstChar(suffix, PERIOD_);
		}
	}
	return suffix;
}

function buildExtglob(
	node: Extract<GlobNode, { kind: "extglob" }>,
	state: BuildState,
): NfaFragment {
	const { builder } = state;
	state.extglobDepth += 1;
	const body = builder.alternate(
		node.branches.map((branch) => buildNodes(branch, state)),
	);
	state.extglobDepth -= 1;

	switch (node.operator) {
		case "@":
			return body;
		case "?":
			return builder.optional(body);
		case "*":
			return builder.star(body);
		case "+":
			return builder.plus(body);
		default:
			// The complement is taken over the same universe `*` draws from, which
			// is what keeps `!(…)` inside one path segment the way a shell does.
			return builder.complement(
				body,
				starSet(state),
				state.bounds.maxComplementStates,
			);
	}
}

/**
 * Compiles a parsed pattern to a matcher backed by `@ac-kit/format-regex`'s
 * Pike VM.
 *
 * This is the correctness baseline. Every thread advances one character in
 * lockstep and nothing backtracks, so the linear-time property is the engine's
 * rather than the translation's — which is what makes `!(…)` and `*(…)`
 * implementable at all.
 *
 * Compilation is O(pattern length) except across `!(…)`, where determinising
 * the body is worst-case exponential and bounded by `maxComplementStates`.
 * Matching is O(program size × path length), bounded by the `regex` step
 * ceiling.
 *
 * @throws {GlobLimitExceededError} If a complement or a range expansion
 *   outgrows its bound.
 * @throws {RegexLimitExceededError} If the compiled program, or a run of it,
 *   outgrows the `regex` bounds.
 */
export function compileGlobVmBody(
	pattern: GlobPattern,
	features: GlobFeatures,
	bounds: GlobCompileBounds,
): (path: string) => boolean {
	const builder = new NfaBuilder();
	const state: BuildState = {
		builder,
		features,
		bounds,
		ranges: [],
		atSegmentStart: true,
		extglobDepth: 0,
	};

	let body = buildNodes(pattern.nodes, state);
	if (needsFloatingPrefix(pattern, features)) {
		body = builder.concat(
			builder.optional(
				builder.concat(
					builder.star(builder.consume(ANY_)),
					builder.consume(SLASH_),
				),
			),
			body,
		);
	}

	const slotCount = (state.ranges.length + 1) * 2;
	const program: RegexProgram = builder.toProgram(
		body,
		slotCount,
		bounds.regex.maxProgramSize,
	);
	const ranges = state.ranges;
	// Closed over as a number, so a match never touches the options object.
	const maxSteps = bounds.regex.maxSteps;

	return (path) => {
		const match = execProgram(program, path, maxSteps);
		if (match === undefined) {
			return false;
		}
		return ranges.every((range, index) => {
			const value = Number(match.groups[index + 1]?.text);
			const low = Math.min(range.from, range.to);
			const high = Math.max(range.from, range.to);
			return value >= low && value <= high;
		});
	};
}
