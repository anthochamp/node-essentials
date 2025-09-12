/**
 * Scale a number in range 0..1 to a new range
 *
 * @param value A number to scale
 * @param min The minimum of the target range
 * @param max The maximum of the target range
 * @returns The scaled number
 */
export function scale1(value: number, min: number, max: number): number {
	return min + value * (max - min);
}

/**
 * Scale a number in range 0..1 to a new range and return an integer.
 *
 * @param value A number to scale
 * @param min The minimum of the target range
 * @param max The maximum of the target range
 * @param roundingMethod The rounding method to use (default: "round")
 * @returns The scaled integer
 */
export function scale1Int(
	value: number,
	min: number,
	max: number,
	roundingMethod: "round" | "floor" | "ceil" = "round",
): number {
	return Math[roundingMethod](value * (max - min) + min);
}
