/**
 * Calculates the minimum and maximum values from a list of numbers.
 *
 * This function iterates through the provided numbers to find the smallest and
 * largest values.
 *
 * Its equivalent to calling `Math.min` and `Math.max`, but does the iteration
 * only once.
 *
 * @param values The values to calculate the min and max of.
 * @returns An object containing the min and max values, or min = `Infinity` and
 * max = `-Infinity` if no values are provided.
 */
export function minmax(...values: number[]): { min: number; max: number } {
	if (values.length === 0) {
		return { min: Infinity, max: -Infinity };
	}

	let min = values[0];
	let max = values[0];

	for (const value of values) {
		if (value < min) {
			min = value;
		}
		if (value > max) {
			max = value;
		}
	}

	return { min, max };
}
