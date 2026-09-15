/**
 * Rounding mode applied when an **arithmetic** result cannot be represented
 * exactly at the requested precision — a division that does not terminate, a
 * square root, a fixed-width result that does not fit.
 *
 * Eleven modes: IEEE 754-2019's five (`ceiling`, `floor`, `down`, `half-even`,
 * `half-up`), the rest of `java.math.RoundingMode` (`up`, `half-down`,
 * `unnecessary`), and three it lacks (`half-ceiling`, `half-floor`,
 * `half-odd`). `unnecessary` does not round at all — it signals when rounding
 * would be needed.
 *
 * This is not the mode a **renderer** uses. `INum.format` delegates to
 * `Intl.NumberFormat`, whose own `roundingMode` covers nine of these under
 * different names (`ceiling`→`ceil`, `up`→`expand`, `down`→`trunc`,
 * `half-up`→`halfExpand`, `half-down`→`halfTrunc`, and the rest verbatim in
 * camel case). The two it has no name for are the two that are not rendering
 * decisions: `unnecessary` is an assertion, and `half-odd` appears in no
 * formatter.
 */
export type RoundingMode =
	/** Toward +∞. */
	| "ceiling"
	/** Toward −∞. */
	| "floor"
	/** Away from zero. */
	| "up"
	/** Toward zero (truncation). */
	| "down"
	/** To nearest; ties away from zero. */
	| "half-up"
	/** To nearest; ties toward zero. */
	| "half-down"
	/** To nearest; ties to the even neighbour. The IEEE 754 default. */
	| "half-even"
	/** To nearest; ties to the odd neighbour. */
	| "half-odd"
	/** To nearest; ties toward +∞. */
	| "half-ceiling"
	/** To nearest; ties toward −∞. */
	| "half-floor"
	/** Signals when the result is not exactly representable. */
	| "unnecessary";

/**
 * The IEEE 754 default rounding mode. Chosen because it is unbiased over a
 * uniform distribution of ties, unlike `half-up`.
 */
export const DEFAULT_ROUNDING_MODE: RoundingMode = "half-even";
