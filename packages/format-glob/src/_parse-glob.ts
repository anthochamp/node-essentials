import { isGlobPosixClassName } from "./_posix-class.js";
import type {
	GlobClassItem,
	GlobExtglobOperator,
	GlobNode,
	GlobPattern,
	GlobPosixClassName,
} from "./ast.js";
import type { GlobFeatures } from "./dialect.js";
import { type GlobParseBounds, GlobLimitExceededError } from "./limits.js";

const EXTGLOB_OPERATORS_: readonly string[] = ["?", "*", "+", "@", "!"];

/**
 * Parsing, once the dialect and the bounds have been resolved by whichever
 * public entry point the caller reached.
 *
 * O(pattern length), except that the brace-expansion check walks the parsed
 * tree once more.
 *
 * @throws {GlobLimitExceededError} If the pattern is longer than
 *   `maxPatternLength`, nests braces or extglobs deeper than their bounds, or
 *   expands to more than `maxBraceProduct` alternatives.
 */
export function parseGlobBounded(
	pattern: string,
	features: GlobFeatures,
	bounds: GlobParseBounds,
): GlobPattern {
	if (pattern.length > bounds.maxPatternLength) {
		throw new GlobLimitExceededError("patternLength", bounds.maxPatternLength);
	}

	let source = pattern;

	if (features.comments && source.startsWith("#")) {
		return {
			nodes: [],
			anchored: false,
			directoryOnly: false,
			negated: false,
			comment: source.slice(1),
		};
	}

	// Repeated `!` toggle, so `!!a` means `a`. A `!` immediately before `(` is the
	// complement extglob instead — bash resolves it that way, and bash is what the
	// preset is named for. `minimatch` takes it as negation and leaves `(a)` as
	// two literal parentheses; see this package's README.
	let negated = false;
	if (features.patternNegation) {
		while (source.startsWith("!") && !(features.extglob && source[1] === "(")) {
			negated = !negated;
			source = source.slice(1);
		}
	}

	let anchored = false;
	let directoryOnly = false;

	if (features.leadingSlashAnchors && source.startsWith("/")) {
		anchored = true;
		source = source.slice(1);
	}
	if (features.trailingSlashMeansDirectory && source.endsWith("/")) {
		directoryOnly = true;
		source = source.slice(0, -1);
	}

	const state: ParseState = {
		source,
		index: 0,
		braceDepth: 0,
		extglobDepth: 0,
		features,
		bounds,
	};
	const nodes = parseSequence(state, null);

	assertBraceProduct(nodes, bounds.maxBraceProduct);

	return { nodes, anchored, directoryOnly, negated, comment: null };
}

type ParseState = {
	readonly source: string;
	index: number;
	braceDepth: number;
	extglobDepth: number;
	readonly features: GlobFeatures;
	readonly bounds: GlobParseBounds;
};

/** Where a nested sequence stops: a brace branch, an extglob branch, or the end. */
type StopAt = "brace" | "extglob" | null;

/** Parses until the enclosing group closes (or the end), coalescing literals. */
function parseSequence(state: ParseState, stopAt: StopAt): GlobNode[] {
	const nodes: GlobNode[] = [];
	let literal = "";

	const flush = (): void => {
		if (literal.length > 0) {
			nodes.push({ kind: "literal", text: literal });
			literal = "";
		}
	};

	while (state.index < state.source.length) {
		const char = state.source[state.index]!;

		if (stopAt === "brace" && (char === "}" || char === ",")) {
			break;
		}
		if (stopAt === "extglob" && (char === ")" || char === "|")) {
			break;
		}

		if (char === "\\" && state.features.backslashEscape) {
			const next = state.source[state.index + 1];
			if (next !== undefined) {
				literal += next;
				state.index += 2;
				continue;
			}
		}

		// Before the `*` and `?` cases: `*(a)` is one extended group, not a star
		// followed by a parenthesis.
		if (
			state.features.extglob &&
			state.source[state.index + 1] === "(" &&
			EXTGLOB_OPERATORS_.includes(char)
		) {
			const parsed = parseExtglob(state, char as GlobExtglobOperator);
			if (parsed) {
				flush();
				nodes.push(parsed);
				continue;
			}
		}

		if (char === "/") {
			flush();
			nodes.push({ kind: "separator" });
			state.index += 1;
			continue;
		}

		if (char === "*") {
			flush();
			if (state.features.globstar && state.source[state.index + 1] === "*") {
				nodes.push({ kind: "globstar" });
				state.index += 2;
				continue;
			}
			nodes.push({ kind: "star" });
			state.index += 1;
			continue;
		}

		if (char === "?" && state.features.singleChar) {
			flush();
			nodes.push({ kind: "any-char" });
			state.index += 1;
			continue;
		}

		if (char === "[" && state.features.characterClass) {
			const parsed = parseClass(state);
			if (parsed) {
				flush();
				nodes.push(parsed);
				continue;
			}
		}

		if (
			char === "{" &&
			(state.features.braceAlternation || state.features.braceRange)
		) {
			const parsed = parseBrace(state);
			if (parsed) {
				flush();
				nodes.push(parsed);
				continue;
			}
		}

		literal += char;
		state.index += 1;
	}

	flush();
	return nodes;
}

/** Returns `null` when the bracket does not close, so it stays literal. */
function parseClass(state: ParseState): GlobNode | null {
	const start = state.index;
	let index = start + 1;

	let negated = false;
	const negators =
		state.features.classNegation === "both"
			? ["!", "^"]
			: [state.features.classNegation];
	if (index < state.source.length && negators.includes(state.source[index]!)) {
		negated = true;
		index += 1;
	}

	const items: GlobClassItem[] = [];
	// A `]` in the first position is a literal member, per POSIX.
	let first = true;

	while (index < state.source.length) {
		const char = state.source[index]!;

		if (char === "]" && !first) {
			state.index = index + 1;
			return { kind: "class", negated, items };
		}
		first = false;

		if (state.features.posixClasses && char === "[") {
			const posix = matchPosixClass(state.source, index);
			if (posix) {
				items.push({ kind: "posix", name: posix.name });
				index = posix.end;
				continue;
			}
		}

		if (
			state.source[index + 1] === "-" &&
			state.source[index + 2] !== undefined &&
			state.source[index + 2] !== "]"
		) {
			items.push({ kind: "span", from: char, to: state.source[index + 2]! });
			index += 3;
			continue;
		}

		items.push({ kind: "char", char });
		index += 1;
	}

	return null;
}

const POSIX_CLASS_PATTERN_ = /^\[:([a-z]+):\]/;

/** Returns `null` for an unknown name, so `[[:nope:]]` stays ordinary members. */
function matchPosixClass(
	source: string,
	start: number,
): { name: GlobPosixClassName; end: number } | null {
	const match = POSIX_CLASS_PATTERN_.exec(source.slice(start));
	const name = match?.[1];
	if (name === undefined || !isGlobPosixClassName(name)) {
		return null;
	}
	return { name, end: start + match![0].length };
}

/** Returns `null` when the group does not close, so it stays literal. */
function parseExtglob(
	state: ParseState,
	operator: GlobExtglobOperator,
): GlobNode | null {
	if (state.extglobDepth >= state.bounds.maxExtglobDepth) {
		throw new GlobLimitExceededError(
			"extglobDepth",
			state.bounds.maxExtglobDepth,
		);
	}

	const start = state.index;
	state.index = start + 2;
	state.extglobDepth += 1;

	const branches: GlobNode[][] = [];
	for (;;) {
		branches.push(parseSequence(state, "extglob"));
		const char = state.source[state.index];
		if (char === "|") {
			state.index += 1;
			continue;
		}
		if (char === ")") {
			state.index += 1;
			state.extglobDepth -= 1;
			return { kind: "extglob", operator, branches };
		}
		// Unterminated: rewind and let the operator and the paren be literal.
		state.index = start;
		state.extglobDepth -= 1;
		return null;
	}
}

/** Returns `null` when the brace does not close, so it stays literal. */
function parseBrace(state: ParseState): GlobNode | null {
	if (state.braceDepth >= state.bounds.maxBraceDepth) {
		throw new GlobLimitExceededError("braceDepth", state.bounds.maxBraceDepth);
	}

	const start = state.index;

	if (state.features.braceRange) {
		const range = matchRange(state.source, start);
		if (range) {
			state.index = range.end;
			return { kind: "range", from: range.from, to: range.to };
		}
	}
	if (!state.features.braceAlternation) {
		return null;
	}

	state.index = start + 1;
	state.braceDepth += 1;

	const branches: GlobNode[][] = [];
	for (;;) {
		branches.push(parseSequence(state, "brace"));
		const char = state.source[state.index];
		if (char === ",") {
			state.index += 1;
			continue;
		}
		if (char === "}") {
			state.index += 1;
			state.braceDepth -= 1;
			// `{a}` with no comma is a literal brace group in every dialect here.
			if (branches.length < 2) {
				state.index = start;
				return null;
			}
			return { kind: "alternation", branches };
		}
		// Unterminated: rewind and let the brace be literal.
		state.index = start;
		state.braceDepth -= 1;
		return null;
	}
}

const RANGE_PATTERN_ = /^\{(-?\d+)\.\.(-?\d+)\}/;

function matchRange(
	source: string,
	start: number,
): { from: number; to: number; end: number } | null {
	const match = RANGE_PATTERN_.exec(source.slice(start));
	if (!match) {
		return null;
	}
	return {
		from: Number(match[1]),
		to: Number(match[2]),
		end: start + match[0].length,
	};
}

/**
 * Rejects a pattern whose braces expand to more alternatives than the bound.
 *
 * Nesting depth does not bound this on its own: `{a,b}{a,b}{a,b}` is one level
 * deep and eight alternatives. O(nodes), and the running product stops being
 * multiplied once it passes the bound, so an adversarial pattern cannot make
 * the check itself expensive.
 */
function assertBraceProduct(nodes: readonly GlobNode[], limit: number): void {
	if (sequenceProduct(nodes, limit) > limit) {
		throw new GlobLimitExceededError("braceProduct", limit);
	}
}

function sequenceProduct(nodes: readonly GlobNode[], limit: number): number {
	let product = 1;
	for (const node of nodes) {
		product *= nodeProduct(node, limit);
		if (product > limit) {
			return product;
		}
	}
	return product;
}

function nodeProduct(node: GlobNode, limit: number): number {
	if (node.kind === "alternation") {
		let total = 0;
		for (const branch of node.branches) {
			total += sequenceProduct(branch, limit);
			if (total > limit) {
				return total;
			}
		}
		return total;
	}
	if (node.kind === "extglob") {
		// An extglob branch is an alternative inside the compiled matcher, never a
		// separately expanded pattern, so branches do not multiply.
		let widest = 1;
		for (const branch of node.branches) {
			widest = Math.max(widest, sequenceProduct(branch, limit));
		}
		return widest;
	}
	return 1;
}
