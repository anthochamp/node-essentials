/**
 * Clamp a number between a minimum and a maximum value
 *
 * @param value The number to clamp
 * @param min The minimum value
 * @param max The maximum value
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
	if (min > max) {
		throw new RangeError("min must not be greater than max");
	}

	return Math.min(Math.max(value, min), max);
}
