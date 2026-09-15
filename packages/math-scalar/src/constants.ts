/**
 * Numeric constants that binary64 can only hold to its own precision, spelled
 * once so every consumer rounds them identically.
 *
 * Each is written as the literal rather than as the expression that produces
 * it, because a recomputed constant can differ between two call sites by an
 * ulp. The expression is kept beside it as a comment, which is what makes the
 * literal checkable.
 *
 * `Math.PI`, `Math.E`, `Math.LOG2E` and `Math.LOG10E` are not duplicated here —
 * the platform already provides them.
 */

/** Degrees to radians: multiply an angle in degrees by this. */
export const DEG_TO_RAD = 0.017453292519943295 as const; // Math.PI / 180;

/** Radians to degrees: multiply an angle in radians by this. */
export const RAD_TO_DEG = 57.29577951308232 as const; // 180 / Math.PI;

/** A full turn in radians. */
export const TWO_PI = 6.283185307179586 as const; // 2 * Math.PI

/** {@link TWO_PI}, under the name readers of the τ notation expect. */
export const TAU = TWO_PI;

/** A quarter turn in radians — the argument at which sine peaks. */
export const HALF_PI = 1.5707963267948966 as const; // Math.PI / 2

/** An eighth of a turn in radians, i.e. 45°. */
export const QUARTER_PI = 0.7853981633974483 as const; // Math.PI / 4

/**
 * The normalising factor of the Gaussian and of Stirling's series.
 *
 * Shared rather than recomputed so every consumer spells the same rounding of
 * it: a gamma function and a normal density that disagree here disagree in
 * their last digit for no reason a caller could discover.
 */
export const SQRT_TWO_PI = 2.5066282746310002 as const; // Math.sqrt(2 * Math.PI)

/** `ln 2π`, the same factor in log space, for anything working in logarithms. */
export const LN_TWO_PI = 1.8378770664093453 as const; // Math.log(2 * Math.PI)

/** The golden ratio — the limit of the ratio of consecutive Fibonacci numbers. */
export const PHI = 1.618033988749895 as const; // (1 + Math.sqrt(5)) / 2

/** `√2`, the diagonal of a unit square. */
export const SQRT2 = 1.4142135623730951 as const; // Math.sqrt(2)

/**
 * `√½`, which is also `1/√2`.
 *
 * Kept as a multiplier rather than a divisor: multiplying by this is one
 * operation where dividing by {@link SQRT2} is one plus a reciprocal, and the
 * two round differently.
 */
export const SQRT1_2 = 0.7071067811865476 as const; // Math.sqrt(1/2)

/** `ln 2`, the factor between a natural logarithm and a base-2 one. */
export const LN2 = 0.6931471805599453 as const; // Math.log(2)

/** `ln 10`, the factor between a natural logarithm and a base-10 one. */
export const LN10 = 2.302585092994046 as const; // Math.log(10)
