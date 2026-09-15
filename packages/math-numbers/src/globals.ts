import {
	DECIMAL_CONTEXT_IEEE_DECIMAL128,
	DecimalContext,
} from "./decimal/decimal-types.js";
import type { OverflowMode } from "./overflow-mode.js";

/**
 * Global configuration for the numbers module.
 *
 * Provides defaults that all numeric types fall back to when no per-operation
 * option is supplied. Users may mutate these fields freely at runtime.
 *
 * ```ts
 * import { numericConfig } from "./numbers/_config.js";
 *
 * // Use saturation arithmetic globally
 * numericConfig.defaultOverflowMode = "saturate";
 *
 * // Use single-precision decimal context globally
 * numericConfig.defaultDecimalContext = MATH_CONTEXT_DECIMAL32;
 * ```
 */
export const numericConfig: {
	/**
	 * Default overflow mode for all fixed-precision integer types.
	 *
	 * Individual arithmetic operations may override this via an explicit `mode?:
	 * OverflowMode` parameter.
	 *
	 * Default: `'wrap'` — matches C `int8_t` / Java `byte` / WebAssembly i32/i64.
	 */
	defaultOverflowMode: OverflowMode;

	/**
	 * Default precision and rounding context for `Decimal` operations whose
	 * result may not be finitely representable (division, square roots,
	 * transcendental functions).
	 *
	 * Default: `MATH_CONTEXT_DECIMAL128` — 34 significant digits, `halfEven`.
	 */
	defaultDecimalContext: DecimalContext;
} = {
	defaultOverflowMode: "wrap",
	defaultDecimalContext: { ...DECIMAL_CONTEXT_IEEE_DECIMAL128 },
};
