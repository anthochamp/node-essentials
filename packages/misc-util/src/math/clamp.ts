/**
 * Clamp a number between a minimum and a maximum value
 *
 * @param value The number to clamp
 * @param min The minimum value
 * @param max The maximum value
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Clamp a number between a minimum and a maximum value and return an integer
 * in range.
 *
 * Min is rounding up and max is rounded down prior to clamping.
 *
 * @param value The number to clamp
 * @param min The minimum value
 * @param max The maximum value
 * @returns The clamped integer
 */
export function clampInt(
	value: number,
	min: number,
	max: number,
	roundingMethod: "round" | "floor" | "ceil" = "round",
): number {
	min = Math.ceil(min);
	max = Math.floor(max);

	return Math.min(Math.max(Math[roundingMethod](value), min), max);
}
