import { quickselect } from "@ac-kit/algo";
import {
	compareNaturalAscending,
	fromVariadicArgs,
	map,
	minmax,
	sumPrecise,
	type VariadicArgs,
} from "@ac-kit/core";

/**
 * Calculates the arithmetic mean of the given values.
 *
 * The arithmetic mean is the sum of the values divided by the number of values.
 *
 * @param values The values to calculate the mean of, as an array or as separate
 *   arguments.
 * @returns The arithmetic mean of the given values.
 * @see https://en.wikipedia.org/wiki/Arithmetic_mean
 */
export function mean(values: readonly number[]): number;
export function mean(...values: number[]): number;
export function mean(...args: VariadicArgs<number>): number {
	const values = fromVariadicArgs(args);
	const count = values.length;
	if (count === 0) {
		return NaN;
	}

	// Exact: every dispersion function here centres on this mean, so its error
	// would be amplified by the squaring that follows.
	return sumPrecise(values) / count;
}

/**
 * Calculates the geometric mean of the given values.
 *
 * The geometric mean is the nth root of the product of the values, where n is
 * the number of values.
 *
 * @param values The values to calculate the mean of, as an array or as separate
 *   arguments.
 * @returns The geometric mean of the given values.
 * @see https://en.wikipedia.org/wiki/Geometric_mean
 */
export function geometricMean(values: readonly number[]): number;
export function geometricMean(...values: number[]): number;
export function geometricMean(...args: VariadicArgs<number>): number {
	const values = fromVariadicArgs(args);
	const count = values.length;
	if (count === 0) {
		return NaN;
	}

	// Sum of logarithms rather than a running product: a few hundred values below
	// one drive the product to zero, and the denormals it passes through on the
	// way are slow as well as wrong.
	const logarithms: number[] = [];
	for (let index = 0; index < count; index++) {
		const value = values[index]!;
		if (value === 0) {
			return 0;
		}
		logarithms.push(Math.log(value));
	}
	return Math.exp(sumPrecise(logarithms) / count);
}

/**
 * Calculates the harmonic mean of the given values.
 *
 * The harmonic mean is the number of values divided by the sum of the
 * reciprocals of the values.
 *
 * @param values The values to calculate the mean of, as an array or as separate
 *   arguments.
 * @returns The harmonic mean of the given values.
 * @see https://en.wikipedia.org/wiki/Harmonic_mean
 */
export function harmonicMean(values: readonly number[]): number;
export function harmonicMean(...values: number[]): number;
export function harmonicMean(...args: VariadicArgs<number>): number {
	const values = fromVariadicArgs(args);
	const count = values.length;
	if (count === 0) {
		return NaN;
	}

	const reciprocals: number[] = [];
	for (let index = 0; index < count; index++) {
		const value = values[index]!;
		if (value === 0) {
			return 0;
		}
		reciprocals.push(1 / value);
	}
	return count / sumPrecise(reciprocals);
}

/**
 * Calculates the root mean square (or quadratic mean) of the given values.
 *
 * The quadratic mean is the square root of the arithmetic mean of the squares
 * of the values.
 *
 * @param values The values to calculate the mean of, as an array or as separate
 *   arguments.
 * @returns The root mean square of the given values.
 * @see https://en.wikipedia.org/wiki/Root_mean_square
 */
export function rootMeanSquare(values: readonly number[]): number;
export function rootMeanSquare(...values: number[]): number;
export function rootMeanSquare(...args: VariadicArgs<number>): number {
	const values = fromVariadicArgs(args);
	const count = values.length;
	if (count === 0) {
		return NaN;
	}

	return Math.sqrt(sumPrecise(map(values, (value) => value * value)) / count);
}

/**
 * Calculates the median of a list of numbers.
 *
 * The median is the middle value when the numbers are sorted in ascending
 * order.
 *
 * If there is an even number of values, the median is the average of the two
 * middle values.
 *
 * The input is never modified.
 *
 * @param values The values to calculate the median of, as an array or as
 *   separate arguments.
 * @returns Median of the numbers.
 * @see https://en.wikipedia.org/wiki/Median
 */
export function median(values: readonly number[]): number;
export function median(...values: number[]): number;
export function median(...args: VariadicArgs<number>): number {
	const values = fromVariadicArgs(args);
	const count = values.length;
	if (count === 0) {
		return NaN;
	}

	// Selection rather than a full sort: the median needs the element at one
	// index, and partitioning down to it is linear where sorting is not.
	const working = values.slice();
	const middle = count >> 1;
	const upper = quickselect(working, middle, compareNaturalAscending);

	if (count % 2 === 1) {
		return upper;
	}

	// Selecting index `middle` leaves every smaller element on its left, so the
	// other middle value is the largest of that side.
	let lower = -Infinity;
	for (let index = 0; index < middle; index++) {
		const value = working[index]!;
		if (value > lower) {
			lower = value;
		}
	}
	return (lower + upper) / 2;
}

/**
 * Calculates the mode of a list of numbers.
 *
 * The mode is the number that appears most frequently in the list. If multiple
 * numbers have the same highest frequency, all of them are returned.
 *
 * @param values The values to calculate the mode of, as an array or as separate
 *   arguments.
 * @returns Mode of the numbers (can be multiple values).
 * @see https://en.wikipedia.org/wiki/Mode_(statistics)
 */
export function mode(values: readonly number[]): number[];
export function mode(...values: number[]): number[];
export function mode(...args: VariadicArgs<number>): number[] {
	const values = fromVariadicArgs(args);
	const count = values.length;
	if (count === 0) {
		return [];
	}

	const frequencyMap: Map<number, number> = new Map();
	let maxFrequency = 0;

	for (let index = 0; index < count; index++) {
		const value = values[index]!;
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
 * @param values The values to calculate the midrange of, as an array or as
 *   separate arguments.
 * @returns The midrange of the given values.
 * @see https://en.wikipedia.org/wiki/Mid-range
 */
export function midrange(values: readonly number[]): number;
export function midrange(...values: number[]): number;
export function midrange(...args: VariadicArgs<number>): number {
	const values = fromVariadicArgs(args);
	if (values.length === 0) {
		return NaN;
	}

	const { min, max } = minmax(values);
	return (min + max) / 2;
}
