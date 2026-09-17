import { compileGlobBounded, type GlobMatcher } from "./_compile-glob.js";
import { parseGlobBounded } from "./_parse-glob.js";
import type { GlobPattern } from "./ast.js";
import { type GlobDialect, globFeatures } from "./dialect.js";
import { type GlobLimits, globLimits } from "./limits.js";

/**
 * Compiles `pattern` to a matcher.
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
 *
 * `limits` is resolved here and nowhere else below, so the returned matcher
 * closes over plain numbers and a match costs no option handling at all.
 *
 * @throws {GlobLimitExceededError} If the pattern outgrows one of
 *   {@link GlobLimits}.
 */
export function compileGlob(
	pattern: string | GlobPattern,
	dialect: GlobDialect = "posix",
	limits?: GlobLimits,
): GlobMatcher {
	const features = globFeatures(dialect);
	const bounds = globLimits(limits);
	const parsed =
		typeof pattern === "string"
			? parseGlobBounded(pattern, features, bounds)
			: pattern;

	return compileGlobBounded(parsed, features, bounds);
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
	limits?: GlobLimits,
): boolean {
	return compileGlob(pattern, dialect, limits)(path);
}
