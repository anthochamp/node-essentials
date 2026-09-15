import { bitsToFloat64, float64ToBits } from "./float64-bits.js";

/**
 * The representable binary64 value adjacent to `value` in the direction of
 * `direction` — C's `nextafter`.
 *
 * @param value - The starting value.
 * @param direction - The value to step toward; returned as-is when it equals
 *   `value`, so the sign of a zero result follows it.
 * @returns The adjacent value, `direction` when the two are equal, or
 *   `Number.NaN` when either is `NaN`.
 */
export function nextAfter(value: number, direction: number): number {
	if (Number.isNaN(value) || Number.isNaN(direction)) {
		return Number.NaN;
	}

	if (value === direction) {
		return direction;
	}

	if (value === 0) {
		return direction > 0 ? Number.MIN_VALUE : -Number.MIN_VALUE;
	}

	// Magnitude bits ascend away from zero, so stepping away from zero is an
	// increment and stepping toward it a decrement, whatever the sign.
	const bits = float64ToBits(value);
	const awayFromZero = direction > value === value > 0;

	return bitsToFloat64(awayFromZero ? bits + 1n : bits - 1n);
}
