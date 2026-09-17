import { collapseGlobstarRun, needsFloatingPrefix } from "./_glob-shape.js";
import { posixClassCharSet } from "./_posix-class.js";
import type { GlobClassItem, GlobNode, GlobPattern } from "./ast.js";
import type { GlobFeatures } from "./dialect.js";

/** Escapes a character for use as a regex literal. */
function escapeLiteral(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Escapes a character for use inside a regex character class. */
function escapeClassChar(char: string): string {
	return char.replace(/[\\\]^-]/g, "\\$&");
}

function unicodeEscape(code: number): string {
	return `\\u${code.toString(16).padStart(4, "0")}`;
}

function classItemSource(item: GlobClassItem): string {
	switch (item.kind) {
		case "char":
			return escapeClassChar(item.char);
		case "span":
			return `${escapeClassChar(item.from)}-${escapeClassChar(item.to)}`;
		default: {
			// Spelled from the same table the VM backend reads, so the two cannot
			// disagree about what `[[:punct:]]` holds.
			const set = posixClassCharSet(item.name);
			let spans = "";
			for (let index = 0; index < set.length; index += 2) {
				const from = set[index]!;
				const to = set[index + 1]!;
				spans +=
					from === to
						? unicodeEscape(from)
						: `${unicodeEscape(from)}-${unicodeEscape(to)}`;
			}
			return spans;
		}
	}
}

type CompileState = {
	/** Inclusive integer ranges, in capture-group order. */
	readonly ranges: { from: number; to: number }[];
	readonly features: GlobFeatures;
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
				const run = collapseGlobstarRun(nodes, index);
				// A globstar and its separator are optional together: they must also
				// match zero intervening segments.
				source += run.sawSeparator ? "(?:.*/)?" : ".*";
				state.atSegmentStart = run.sawSeparator;
				index = run.end;
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
			case "extglob": {
				const body = node.branches
					.map((branch) => compileNodes(branch, state))
					.join("|");
				if (node.operator === "@") {
					source += `(?:${body})`;
					break;
				}
				if (node.operator === "?") {
					source += `(?:${body})?`;
					break;
				}
				// Unreachable: `compileGlob` routes a pattern holding `!(…)`, `*(…)`
				// or `+(…)` to the Pike-VM backend, the only one that can express a
				// complement or a nested unbounded repetition without backtracking.
				throw new Error(
					`Extglob operator ${node.operator} requires the VM backend`,
				);
			}
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

/**
 * Compiles a parsed pattern to a matcher backed by a native `RegExp`.
 *
 * Safe only because of how the source is built: the pattern is fully anchored,
 * consecutive `**` runs are collapsed so no two unbounded quantifiers sit side
 * by side, and no construct here nests one repetition inside another. That is
 * construction doing the work an engine does not, which is why it stops being
 * available the moment a pattern holds `!(…)`, `*(…)` or `+(…)`.
 *
 * O(pattern length) to build; matching is the platform `RegExp`'s.
 */
export function compileGlobRegExpBody(
	pattern: GlobPattern,
	features: GlobFeatures,
): (path: string) => boolean {
	const state: CompileState = { ranges: [], features, atSegmentStart: true };
	const body = compileNodes(pattern.nodes, state);

	// An unanchored pattern may start at any segment boundary; an anchored one
	// only at the root.
	const floating = needsFloatingPrefix(pattern, features);
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
