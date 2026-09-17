import { parseGlobBounded } from "./_parse-glob.js";
import type { GlobPattern } from "./ast.js";
import { type GlobDialect, globFeatures } from "./dialect.js";
import { type GlobLimits, globLimits } from "./limits.js";

/**
 * Parses `pattern` under `dialect`, within `limits`.
 *
 * Constructs the dialect does not define are parsed as literal text rather than
 * rejected, so a pattern written for a different tool degrades to an exact
 * match instead of throwing. Outgrowing a bound is the one thing that does
 * throw: past that point the cost has stopped being the author's.
 *
 * O(pattern length), except that the brace-expansion check walks the parsed
 * tree once more.
 *
 * @throws {GlobLimitExceededError} If the pattern is longer than
 *   {@link GlobLimits.maxPatternLength}, nests braces or extglobs deeper than
 *   their bounds, or expands to more than {@link GlobLimits.maxBraceProduct}
 *   alternatives.
 */
export function parseGlob(
	pattern: string,
	dialect: GlobDialect = "posix",
	limits?: GlobLimits,
): GlobPattern {
	return parseGlobBounded(pattern, globFeatures(dialect), globLimits(limits));
}
