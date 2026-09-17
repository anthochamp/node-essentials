import type { GlobNode, GlobPattern } from "./ast.js";
import type { GlobFeatures } from "./dialect.js";

/**
 * Extglob operators the native `RegExp` backend cannot translate safely.
 *
 * `!` is a complement, which needs the automaton and not a pattern string.
 * `*(…)` and `+(…)` put an unbounded quantifier around a group that may hold
 * another one — `*(*|a)` is `(?:[^/]*|a)*`, the shape that backtracks
 * exponentially on a non-match, and the shape this package exists to keep out
 * of a configuration file's reach.
 */
const VM_ONLY_OPERATORS_: ReadonlySet<string> = new Set(["!", "*", "+"]);

/**
 * Whether the Pike-VM backend is required for this pattern.
 *
 * The dialect answers first and cheaply: a dialect with neither `extglob` nor
 * `patternNegation` cannot produce a node that needs the VM, so no walk is
 * necessary. Only a permissive dialect pays for the precise answer — and it has
 * to be asked, because deciding on the dialect alone would send every `"bash"`
 * pattern to the VM and leave the fast path serving nothing.
 *
 * O(nodes) when the walk happens, O(1) otherwise.
 */
export function requiresVmBackend(
	pattern: GlobPattern,
	features: GlobFeatures,
): boolean {
	if (!features.extglob && !features.patternNegation) {
		return false;
	}
	return holdsVmOnlyNode(pattern.nodes);
}

function holdsVmOnlyNode(nodes: readonly GlobNode[]): boolean {
	return nodes.some((node) => {
		if (node.kind === "extglob") {
			return (
				VM_ONLY_OPERATORS_.has(node.operator) ||
				node.branches.some(holdsVmOnlyNode)
			);
		}
		if (node.kind === "alternation") {
			return node.branches.some(holdsVmOnlyNode);
		}
		return false;
	});
}

/**
 * How far a run of `**` and the separators between them reaches, and whether it
 * held a separator.
 *
 * Adjacent globstars collapse into one: `a/**`+`/**`+`/x` means the same as
 * `a/**`+`/x`, and emitting both would put two unbounded runs side by side —
 * the shape that backtracks exponentially on a non-match. Shared by both
 * backends so the two cannot disagree about where a globstar run ends.
 */
export function collapseGlobstarRun(
	nodes: readonly GlobNode[],
	index: number,
): { readonly end: number; readonly sawSeparator: boolean } {
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
	return { end, sawSeparator };
}

/**
 * Whether an unanchored pattern needs a leading "any directory" prefix.
 *
 * A pattern already opening with a globstar and a separator expresses the same
 * thing, and prepending it again would reintroduce exactly the adjacency
 * {@link collapseGlobstarRun} just removed.
 */
export function needsFloatingPrefix(
	pattern: GlobPattern,
	features: GlobFeatures,
): boolean {
	if (!features.leadingSlashAnchors || pattern.anchored) {
		return false;
	}
	const first = pattern.nodes[0];
	if (first?.kind !== "globstar") {
		return true;
	}
	return !collapseGlobstarRun(pattern.nodes, 0).sawSeparator;
}
