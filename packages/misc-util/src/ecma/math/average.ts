import { minmax } from "./minmax.js";

/**
 * Calculates the arithmetic mean of the given values.
 *
 * The arithmetic mean is the sum of the values divided by the number of values.
 *
 * @see https://en.wikipedia.org/wiki/Arithmetic_mean
 * @param values The values to calculate the mean of.
 * @returns The arithmetic mean of the given values.
 */
export function mean(...values: number[]): number {
	if (values.length === 0) {
		return NaN;
	}

	let sum = 0;
	for (const value of values) {
		sum += value;
	}
	return sum / values.length;
}

/**
 * Calculates the geometric mean of the given values.
 *
 * The geometric mean is the nth root of the product of the values, where n is
 * the number of values.
 *
 * @see https://en.wikipedia.org/wiki/Geometric_mean
 * @param values The values to calculate the mean of.
 * @returns The geometric mean of the given values.
 */
export function geometricMean(...values: number[]): number {
	if (values.length === 0) {
		return NaN;
	}

	let product = 1;
	for (const value of values) {
		product *= value;
	}
	return product ** (1 / values.length);
}

/**
 * Calculates the harmonic mean of the given values.
 *
 * The harmonic mean is the number of values divided by the sum of the reciprocals
 * of the values.
 *
 * @see https://en.wikipedia.org/wiki/Harmonic_mean
 * @param values The values to calculate the mean of.
 * @returns The harmonic mean of the given values.
 */
export function harmonicMean(...values: number[]): number {
	if (values.length === 0) {
		return NaN;
	}

	let sum = 0;
	for (const value of values) {
		if (value === 0) return 0;
		sum += 1 / value;
	}
	return values.length / sum;
}

/**
 * Calculates the root mean square (or quadratic mean) of the given values.
 *
 * The quadratic mean is the square root of the arithmetic mean of the squares
 * of the values.
 *
 * @see https://en.wikipedia.org/wiki/Root_mean_square
 * @param values The values to calculate the mean of.
 * @returns The root mean square of the given values.
 */
export function rootMeanSquare(...values: number[]): number {
	if (values.length === 0) {
		return NaN;
	}

	let sum = 0;
	for (const value of values) {
		sum += value * value;
	}
	return Math.sqrt(sum / values.length);
}

/**
 * Calculates the median of a list of numbers.
 *
 * The median is the middle value when the numbers are sorted in ascending order.
 *
 * If there is an even number of values, the median is the average of the two
 * middle values.
 *
 * @see https://en.wikipedia.org/wiki/Median
 * @param values Array of numbers
 * @returns Median of the numbers
 */
export function median(...values: number[]): number {
	if (values.length === 0) {
		return NaN;
	}

	values.sort((a, b) => a - b);

	const mid = Math.floor(values.length / 2);

	if (values.length % 2 === 0) {
		return (values[mid - 1] + values[mid]) / 2;
	} else {
		return values[mid];
	}
}

/**
 * Calculates the mode of a list of numbers.
 *
 * The mode is the number that appears most frequently in the list.
 * If multiple numbers have the same highest frequency, all of them are returned.
 *
 * @see https://en.wikipedia.org/wiki/Mode_(statistics)
 * @param values Array of numbers
 * @returns Mode of the numbers (can be multiple values)
 */
export function mode(...values: number[]): number[] {
	if (values.length === 0) {
		return [];
	}

	const frequencyMap: Map<number, number> = new Map();
	let maxFrequency = 0;

	for (const value of values) {
		const frequency = (frequencyMap.get(value) ?? 0) + 1;
		frequencyMap.set(value, frequency);

		if (frequency > maxFrequency) {
			maxFrequency = frequency;
		}
	}

	const modes: number[] = [];
	for (const [value, frequency] of frequencyMap.entries()) {
		if (frequency === maxFrequency) {
			modes.push(value);
		}
	}

	return modes;
}

/**
 * Calculates the midrange of a list of numbers.
 *
 * The midrange is the average of the minimum and maximum values in the list.
 *
 * @see https://en.wikipedia.org/wiki/Mid-range *
 * @param values The values to calculate the midrange of.
 * @returns The midrange of the given values.
 */
export function midrange(...values: number[]): number {
	if (values.length === 0) {
		return NaN;
	}

	const { min, max } = minmax(...values);
	return (min + max) / 2;
}
