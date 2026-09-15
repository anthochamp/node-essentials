import { DudectResult } from "./_dudect.js";

/**
 * Constant-time check statistics — an alias for {@link DudectResult}, named to
 * match its sibling measures' `_statistics.ts` modules (duration, jitter),
 * which the plugin contract (§4.6) expects one of per measure.
 */
export type ConstantTimeStatistics = DudectResult;
