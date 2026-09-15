import {
	type VariadicArgs,
	fromVariadicArgs,
} from "../function/variadic-args.js";

/**
 * Smallest of `values` — the `bigint` equivalent `Math.min` does not accept.
 *
 * `Math.min()` answers `Infinity` for an empty list; `bigint` has no infinity
 * to answer with, so an empty list throws instead of inventing a sentinel.
 *
 * @param values The values to compare, as an array or as separate arguments.
 * @throws {RangeError} When no value is given.
 */
export function bigIntMin(values: readonly bigint[]): bigint;
export function bigIntMin(...values: bigint[]): bigint;
export function bigIntMin(...args: VariadicArgs<bigint>): bigint {
	const values = fromVariadicArgs(args);
	let smallest = values[0];

	if (smallest === undefined) {
		throw new RangeError("bigIntMin needs at least one value");
	}

	for (let index = 1; index < values.length; index++) {
		const value = values[index]!;

		if (value < smallest) {
			smallest = value;
		}
	}

	return smallest;
}

/**
 * Largest of `values` — the `bigint` equivalent `Math.max` does not accept.
 *
 * @param values The values to compare, as an array or as separate arguments.
 * @throws {RangeError} When no value is given.
 */
export function bigIntMax(values: readonly bigint[]): bigint;
export function bigIntMax(...values: bigint[]): bigint;
export function bigIntMax(...args: VariadicArgs<bigint>): bigint {
	const values = fromVariadicArgs(args);
	let largest = values[0];

	if (largest === undefined) {
		throw new RangeError("bigIntMax needs at least one value");
	}

	for (let index = 1; index < values.length; index++) {
		const value = values[index]!;

		if (value > largest) {
			largest = value;
		}
	}

	return largest;
}
