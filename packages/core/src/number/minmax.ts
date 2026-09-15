import { VariadicArgs, fromVariadicArgs } from "../function/variadic-args.js";

export type MinMaxResult = { min: number; max: number };

/**
 * Calculates the minimum and maximum values from a list of numbers.
 *
 * This function iterates through the provided numbers to find the smallest and
 * largest values.
 *
 * Its equivalent to calling `Math.min` and `Math.max`, but does the iteration
 * only once.
 *
 * @param values The values to calculate the min and max of, as an array or as
 *   separate arguments.
 * @returns An object containing the min and max values, or min = `Infinity` and
 *   max = `-Infinity` if no values are provided.
 */
export function minmax(values: readonly number[]): MinMaxResult;
export function minmax(...values: number[]): MinMaxResult;
export function minmax(...args: VariadicArgs<number>): MinMaxResult {
	const values = fromVariadicArgs(args);
	if (values[0] === undefined) {
		return { min: Infinity, max: -Infinity };
	}

	let min = values[0];
	let max = values[0];

	// Indexed rather than `for…of`: the array iterator is not inlined here, and on
	// a large array that dominates the comparison it is meant to be doing.
	for (let index = 1; index < values.length; index++) {
		const value = values[index]!;
		if (value < min) {
			min = value;
		}
		if (value > max) {
			max = value;
		}
	}

	return { min, max };
}
