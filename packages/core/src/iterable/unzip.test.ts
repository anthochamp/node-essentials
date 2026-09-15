import { describe, expect, it } from "vitest";

import { unzip } from "./unzip.js";
import { zip } from "./zip.js";

describe("unzip", () => {
	it("should split tuples into one array per position", () => {
		expect(
			unzip([
				[1, "a"],
				[2, "b"],
				[3, "c"],
			]),
		).toEqual([
			[1, 2, 3],
			["a", "b", "c"],
		]);
	});

	it("should round-trip with zip", () => {
		const columns: [number[], string[]] = [
			[1, 2, 3],
			["a", "b", "c"],
		];

		expect(unzip([...zip(columns)])).toEqual(columns);
	});

	it("should return no columns for an empty input", () => {
		expect(unzip([])).toEqual([]);
	});

	it("should handle tuples of one element", () => {
		expect(unzip([[1], [2]])).toEqual([[1, 2]]);
	});

	it("should widen to the longest tuple, leaving short columns short", () => {
		expect(unzip([[1, 2], [3]] as [number, number?][])).toEqual([[1, 3], [2]]);
	});

	it("should accept non-array iterables of tuples", () => {
		function* pairs(): IterableIterator<[number, number]> {
			yield [1, 2];
			yield [3, 4];
		}

		expect(unzip(pairs())).toEqual([
			[1, 3],
			[2, 4],
		]);
	});
});
