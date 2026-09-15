import type { GlobClassItem, GlobNode, GlobPattern } from "./ast.js";
import { type GlobDialect, globFeatures } from "./dialect.js";
import { parseGlob } from "./parse-glob.js";

/** Escapes a character for use as a regex literal. */
function escapeLiteral(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Escapes a character for use inside a regex character class. */
function escapeClassChar(char: string): string {
	return char.replace(/[\\\]^-]/g, "\\$&");
}

function classItemSource(item: GlobClassItem): string {
	return item.kind === "char"
		? escapeClassChar(item.char)
		: `${escapeClassChar(item.from)}-${escapeClassChar(item.to)}`;
}

type CompileState = {
	/** Inclusive integer ranges, in capture-group order. */
	readonly ranges: { from: number; to: number }[];
	readonly features: ReturnType<typeof globFeatures>;
	/** Whether the next node starts a path segment, for the leading-period rule. */
	atSegmentStart: boolean;
};

function compileNodes(nodes: readonly GlobNode[], state: CompileState): string {
	let source = "";

	for (let index = 0; index < nodes.length; index++) {
		const node = nodes[index]!;
		const segmentStart = state.atSegmentStart;
		state.atSegmentStart = false;

		switch (node.kind) {
			case "literal":
				source += escapeLiteral(node.text);
				break;
			case "separator":
				source += "/";
				state.atSegmentStart = true;
				break;
			case "any-char":
				source += guardPeriod(state, segmentStart) + "[^/]";
				break;
			case "star":
				source +=
					guardPeriod(state, segmentStart) +
					(state.features.starCrossesSeparator ? ".*" : "[^/]*");
				break;
			case "globstar": {
				// Adjacent globstars collapse into one. `**/**/x` means the same as
				// `**/x`, and emitting both would put two unbounded `.*` runs side by
				// side — the shape that backtracks exponentially on a non-match.
				let end = index;
				let sawSeparator = false;
				while (end + 1 < nodes.length) {
					const next = nodes[end + 1]!;
					if (next.kind === "separator") {
						sawSeparator = true;
					} else if (next.kind !== "globstar") {
						break;
					}
					end += 1;
				}
				// `**/` is optional: it must also match zero intervening segments.
				source += sawSeparator ? "(?:.*/)?" : ".*";
				state.atSegmentStart = sawSeparator;
				index = end;
				break;
			}
			case "class": {
				const items = node.items.map(classItemSource).join("");
				source += `${guardPeriod(state, segmentStart)}[${node.negated ? "^" : ""}${items}]`;
				break;
			}
			case "alternation":
				source += `(?:${node.branches
					.map((branch) => compileNodes(branch, state))
					.join("|")})`;
				break;
			default:
				// A numeric range cannot be expressed as a regex character range, and
				// expanding it to an alternation is unbounded — `{1..1000000}` would
				// generate a megabyte of pattern. Capture the digits and check the
				// bound after matching instead: exact, and linear in the input.
				state.ranges.push({ from: node.from, to: node.to });
				source += "(-?\\d+)";
				break;
		}
	}

	return source;
}

/**
 * POSIX hides dot-files from wildcards: a leading period must be matched by a
 * literal period, never by `*`, `?` or a class.
 */
function guardPeriod(state: CompileState, atSegmentStart: boolean): string {
	return state.features.periodMustBeExplicit && atSegmentStart ? "(?!\\.)" : "";
}

/** Tests a path against a compiled pattern. */
export type GlobMatcher = (path: string) => boolean;

/**
 * Compiles `pattern` to a matcher backed by a native `RegExp`.
 *
 * The pattern is fully anchored, and consecutive `**` runs are collapsed so no
 * two unbounded quantifiers ever sit side by side — that adjacency is what
 * makes a glob-to-regex translation backtrack exponentially, and it matters
 * because patterns come from configuration files rather than from the program.
 *
 * Numeric ranges are the one thing a regex cannot express: they are captured
 * and range-checked after the match rather than expanded into an alternation,
 * which keeps `{1..1000000}` the same size as `{1..9}`.
 */
export function compileGlob(
	pattern: string | GlobPattern,
	dialect: GlobDialect = "posix",
): GlobMatcher {
	const features = globFeatures(dialect);
	const parsed =
		typeof pattern === "string" ? parseGlob(pattern, dialect) : pattern;

	const state: CompileState = {
		ranges: [],
		features,
		atSegmentStart: true,
	};
	const body = compileNodes(parsed.nodes, state);

	// An unanchored pattern may start at any segment boundary; an anchored one
	// only at the root. A leading `**/` already expresses the same thing, so
	// prepending it again would reintroduce the adjacency just collapsed.
	const floating =
		features.leadingSlashAnchors &&
		!parsed.anchored &&
		!body.startsWith("(?:.*/)?");
	const regex = new RegExp(
		`^${floating ? "(?:.*/)?" : ""}${body}$`,
		features.caseSensitive ? "" : "i",
	);
	const ranges = state.ranges;

	if (ranges.length === 0) {
		return (path) => regex.test(path);
	}

	return (path) => {
		const match = regex.exec(path);
		if (!match) {
			return false;
		}
		return ranges.every((range, index) => {
			const value = Number(match[index + 1]);
			const low = Math.min(range.from, range.to);
			const high = Math.max(range.from, range.to);
			return value >= low && value <= high;
		});
	};
}

/**
 * Tests one path against one pattern.
 *
 * A utility over {@link compileGlob}; compile once and reuse the matcher when
 * testing many paths against the same pattern.
 */
export function matchGlob(
	path: string,
	pattern: string,
	dialect: GlobDialect = "posix",
): boolean {
	return compileGlob(pattern, dialect)(path);
}
