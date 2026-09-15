import type { GlobClassItem, GlobNode, GlobPattern } from "./ast.js";
import { type GlobDialect, globFeatures } from "./dialect.js";

/**
 * Maximum brace nesting accepted.
 *
 * Patterns come from configuration files, which are user input; bounding the
 * nesting bounds both parser recursion and the size of the compiled matcher.
 * Real patterns nest one or two deep.
 */
const MAX_BRACE_DEPTH_ = 10;

/** Thrown when a pattern cannot be parsed under the requested dialect. */
export class GlobSyntaxError extends Error {
	constructor(
		message: string,
		readonly offset: number,
	) {
		super(message);
		this.name = "GlobSyntaxError";
	}
}

/**
 * Parses `pattern` under `dialect`.
 *
 * Constructs the dialect does not define are parsed as literal text rather than
 * rejected, so a pattern written for a different tool degrades to an exact
 * match instead of throwing.
 */
export function parseGlob(
	pattern: string,
	dialect: GlobDialect = "posix",
): GlobPattern {
	const features = globFeatures(dialect);

	let source = pattern;
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

	const state = { source, index: 0, depth: 0, features };
	const nodes = parseSequence(state, null);

	return { nodes, anchored, directoryOnly };
}

type ParseState = {
	readonly source: string;
	index: number;
	depth: number;
	readonly features: ReturnType<typeof globFeatures>;
};

/** Parses until `stopAt` (or the end), coalescing adjacent literals. */
function parseSequence(
	state: ParseState,
	stopAt: "}" | "," | null,
): GlobNode[] {
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

		if (stopAt !== null && (char === "}" || char === ",")) {
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

/** Returns `null` when the brace does not close, so it stays literal. */
function parseBrace(state: ParseState): GlobNode | null {
	if (state.depth >= MAX_BRACE_DEPTH_) {
		throw new GlobSyntaxError(
			`Brace nesting deeper than ${MAX_BRACE_DEPTH_}`,
			state.index,
		);
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
	state.depth += 1;

	const branches: GlobNode[][] = [];
	for (;;) {
		branches.push(parseSequence(state, "}"));
		const char = state.source[state.index];
		if (char === ",") {
			state.index += 1;
			continue;
		}
		if (char === "}") {
			state.index += 1;
			state.depth -= 1;
			// `{a}` with no comma is a literal brace group in every dialect here.
			if (branches.length < 2) {
				state.index = start;
				return null;
			}
			return { kind: "alternation", branches };
		}
		// Unterminated: rewind and let the brace be literal.
		state.index = start;
		state.depth -= 1;
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
