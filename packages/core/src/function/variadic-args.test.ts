import { describe, expect, it } from "vitest";

import { fromVariadicArgs, type VariadicArgs } from "./variadic-args.js";

/** Stand-in for a real consumer, exercising both declared overloads. */
function collect(values: readonly number[]): readonly number[];
function collect(...values: number[]): readonly number[];
function collect(...args: VariadicArgs<number>): readonly number[] {
	return fromVariadicArgs(args);
}

describe("fromVariadicArgs", () => {
	it("should return the values when called with separate arguments", () => {
		expect(collect(1, 2, 3)).toEqual([1, 2, 3]);
	});

	it("should return the array when called with a single array", () => {
		expect(collect([1, 2, 3])).toEqual([1, 2, 3]);
	});

	it("should treat a lone value as a value rather than a list", () => {
		expect(collect(7)).toEqual([7]);
	});

	it("should return an empty list when called with no arguments", () => {
		expect(collect()).toEqual([]);
	});

	it("should return an empty list when called with an empty array", () => {
		expect(collect([])).toEqual([]);
	});

	it("should return the caller's array without copying it", () => {
		const values = [1, 2, 3];

		expect(collect(values)).toBe(values);
	});

	it("should accept more values than a spread call could carry", () => {
		const values = Array.from({ length: 200_000 }, (_, index) => index);

		expect(collect(values)).toHaveLength(200_000);
	});

	it("should keep string values distinct from an array of strings", () => {
		function collectText(values: readonly string[]): readonly string[];
		function collectText(...values: string[]): readonly string[];
		function collectText(...args: VariadicArgs<string>): readonly string[] {
			return fromVariadicArgs(args);
		}

		expect(collectText("a")).toEqual(["a"]);
		expect(collectText(["a"])).toEqual(["a"]);
		expect(collectText("a", "b")).toEqual(["a", "b"]);
	});
});
