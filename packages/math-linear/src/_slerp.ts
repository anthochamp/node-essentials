/**
 * Largest `dot` at which spherical linear interpolation still divides by `sin
 * θ₀` safely; above it, callers fall back to normalised linear interpolation.
 *
 * Every slerp here evaluates the same expression, for unit-length operands
 * whose dot product is `dot = cos θ₀`:
 *
 * ```text
 * slerp(a, b, t) = a·(cos θ − dot·sin θ / sin θ₀) + b·(sin θ / sin θ₀)
 *   θ₀ = acos(dot)
 *   θ  = θ₀·t
 * ```
 *
 * Both weights carry `sin θ₀` in the denominator, and `θ₀ → 0` as the operands
 * align, so the quotient amplifies whatever error `acos` returned. `acos` is
 * itself ill-conditioned there:
 *
 * ```text
 * d(acos dot)/d(dot) = −1 / √(1 − dot²)
 * ```
 *
 * Which diverges at `dot = ±1`. At this threshold that derivative is `≈ −31.6`,
 * so one ULP of error in `dot` (`≈ 1.1e-16` near 1) costs `≈ 3.5e-15 rad` in
 * `θ₀` — negligible against `θ₀ = acos(0.9995) ≈ 0.0316 rad ≈ 1.81°`, and `sin
 * θ₀ ≈ 0.0316` stays three orders of magnitude above `√ε ≈ 1.5e-8`. Closer to
 * `1` both bounds collapse together.
 *
 * Below that angle the fallback costs nothing observable: normalised linear
 * interpolation traces the same great-circle arc and differs only in
 * parameterisation, agreeing exactly at `t = 0`, `0.5` and `1` and deviating by
 * `O(θ₀²)` — under `1e-3 rad` here — in between.
 *
 * `0.9995` is the conventional value: glMatrix, three.js and Shoemake's
 * original formulation all switch here.
 *
 * Not a tolerance, and deliberately not configurable — it selects which formula
 * computes the answer, never what the answer means.
 */
export const SLERP_LINEAR_FALLBACK_DOT_ = 0.9995;
