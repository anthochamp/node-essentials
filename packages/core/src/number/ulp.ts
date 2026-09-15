import { nextAfter } from "./next-after.js";

/**
 * Width of one unit in the last place at `value` — the gap between `|value|`
 * and the next representable binary64 away from zero.
 *
 * @returns The ULP width, `Number.NaN` for `NaN`, or `Infinity` for an infinite
 *   input.
 */
export function ulp(value: number): number {
	if (Number.isNaN(value)) {
		return Number.NaN;
	}

	if (!Number.isFinite(value)) {
		return Number.POSITIVE_INFINITY;
	}

	const magnitude = Math.abs(value);
	const next = nextAfter(magnitude, Number.POSITIVE_INFINITY);

	// At MAX_VALUE the step away from zero overflows to Infinity, so the gap is
	// measured on the other side, where the exponent is the same.
	return Number.isFinite(next)
		? next - magnitude
		: magnitude - nextAfter(magnitude, 0);
}
