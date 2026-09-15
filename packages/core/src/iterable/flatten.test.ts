import { describe, expect, it } from "vitest";

import { flatten } from "./flatten.js";

describe("flatten", () => {
	it("should concatenate the inner iterables", () => {
		expect([
			...flatten([
				[1, 2],
				[3, 4],
			]),
		]).toEqual([1, 2, 3, 4]);
	});

	it("should flatten one level only", () => {
		expect([...flatten([[[1], [2]], [[3]]])]).toEqual([[1], [2], [3]]);
	});

	it("should agree with Array.prototype.flat", () => {
		const nested = [[1, 2], [3], [], [4]];

		expect([...flatten(nested)]).toEqual(nested.flat());
	});

	it("should skip empty inner iterables", () => {
		expect([...flatten([[], [1], []])]).toEqual([1]);
	});

	it("should yield nothing for an empty outer iterable", () => {
		expect([...flatten([])]).toEqual([]);
	});

	it("should accept non-array iterables at both levels", () => {
		function* outer(): IterableIterator<Set<number>> {
			yield new Set([1, 2]);
			yield new Set([3]);
		}

		expect([...flatten(outer())]).toEqual([1, 2, 3]);
	});

	it("should flatten strings to characters, as the type says", () => {
		expect([...flatten(["ab", "c"])]).toEqual(["a", "b", "c"]);
	});

	it("should be lazy — it does not pull beyond what is requested", () => {
		let produced = 0;
		function* counted(): IterableIterator<number[]> {
			while (true) {
				produced++;
				yield [produced];
			}
		}

		flatten(counted()).next();

		expect(produced).toBe(1);
	});
});
