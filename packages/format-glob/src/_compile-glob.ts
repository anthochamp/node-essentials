import { compileGlobRegExpBody } from "./_compile-regexp.js";
import { compileGlobVmBody } from "./_compile-vm.js";
import { requiresVmBackend } from "./_glob-shape.js";
import type { GlobNode, GlobPattern } from "./ast.js";
import type { GlobFeatures } from "./dialect.js";
import type { GlobCompileBounds } from "./limits.js";

/** Tests a path against a compiled pattern. */
export type GlobMatcher = (path: string) => boolean;

function holdsSeparator(nodes: readonly GlobNode[]): boolean {
	return nodes.some((node) => {
		if (node.kind === "separator" || node.kind === "globstar") {
			return true;
		}
		if (node.kind === "alternation" || node.kind === "extglob") {
			return node.branches.some(holdsSeparator);
		}
		return false;
	});
}

/**
 * Applies the pattern-level decisions neither backend is involved in: a comment
 * matches nothing, `matchBase` moves the test onto the last segment, and a
 * leading `!` inverts whatever came out.
 */
function wrapMatcher(
	body: GlobMatcher,
	pattern: GlobPattern,
	features: GlobFeatures,
): GlobMatcher {
	if (pattern.comment !== null) {
		return () => false;
	}

	let matcher = body;
	if (
		features.matchBase &&
		!pattern.anchored &&
		!holdsSeparator(pattern.nodes)
	) {
		matcher = (path) => body(path.slice(path.lastIndexOf("/") + 1));
	}

	return pattern.negated ? (path) => !matcher(path) : matcher;
}

/**
 * Compilation, once the dialect and the bounds have been resolved by whichever
 * public entry point the caller reached.
 *
 * Two backends sit behind this, and which one runs is decided here rather than
 * by the caller. `@ac-kit/format-regex`'s Pike VM is the correctness baseline:
 * it backtracks over nothing, so its linear-time property belongs to the engine
 * and holds for every construct including `!(…)`. A native `RegExp` is the fast
 * path, and it is only safe because of how its source is built — fully
 * anchored, `**` runs collapsed, no repetition nested inside another — so it is
 * chosen only when the parsed pattern provably holds none of the constructs
 * that would break that reasoning. The two agree by construction and by a
 * differential test; a caller cannot tell them apart except by timing.
 *
 * Numeric ranges are the one thing neither engine can express directly: the
 * digits are captured and range-checked after the match, which keeps
 * `{1..1000000}` the same size as `{1..9}`.
 */
export function compileGlobBounded(
	pattern: GlobPattern,
	features: GlobFeatures,
	bounds: GlobCompileBounds,
): GlobMatcher {
	const body = requiresVmBackend(pattern, features)
		? compileGlobVmBody(pattern, features, bounds)
		: compileGlobRegExpBody(pattern, features);

	return wrapMatcher(body, pattern, features);
}
