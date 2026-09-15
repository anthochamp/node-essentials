import { clamp } from "../clamp.js";
import { RoundingMethod, round } from "../round.js";

/**
 * Clamp a number between a minimum and a maximum value and return an integer in
 * range.
 *
 * Min is rounding up and max is rounded down prior to clamping.
 *
 * @param value The number to clamp
 * @param min The minimum value
 * @param max The maximum value
 * @returns The clamped integer
 */
export function clampToInteger(
	value: number,
	min: number,
	max: number,
	roundingMethod: RoundingMethod = "round",
): number {
	min = Math.ceil(min);
	max = Math.floor(max);
	value = round(value, { roundingMethod });

	return clamp(value, min, max);
}
