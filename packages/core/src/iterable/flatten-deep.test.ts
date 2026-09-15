import { describe, expect, it } from "vitest";

import { flattenDeep } from "./flatten-deep.js";

describe("flattenDeep", () => {
	it("should flatten to arbitrary depth", () => {
		expect([...flattenDeep([1, [2, [3, [4]]]])]).toEqual([1, 2, 3, 4]);
	});

	it("should agree with Array.prototype.flat(Infinity)", () => {
		const nested = [1, [2, [3, [4, [5]]]], 6];

		expect([...flattenDeep(nested)]).toEqual(
			nested.flat(Number.POSITIVE_INFINITY),
		);
	});

	it("should never descend into a string", () => {
		expect([...flattenDeep(["ab", ["cd"]])]).toEqual(["ab", "cd"]);
	});

	it("should descend into a string that flatten would split", () => {
		expect([...flattenDeep(["ab"])]).toEqual(["ab"]);
	});

	it("should yield nothing for an empty iterable", () => {
		expect([...flattenDeep([])]).toEqual([]);
	});

	it("should drop empty nested levels", () => {
		expect([...flattenDeep([[], [[]], [1]])]).toEqual([1]);
	});

	it("should descend into Sets and typed arrays", () => {
		expect([...flattenDeep([new Set([1, 2]), [Uint8Array.of(3, 4)]])]).toEqual([
			1, 2, 3, 4,
		]);
	});

	it("should keep a flat iterable unchanged", () => {
		expect([...flattenDeep([1, 2, 3])]).toEqual([1, 2, 3]);
	});

	it("should be lazy — it does not pull beyond what is requested", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		flattenDeep(counted()).next();

		expect(produced).toBe(1);
	});
});
