import { describe, expect, it } from "vitest";

import { concat } from "./concat.js";

describe("concat", () => {
	it("should chain multiple iterables in order", () => {
		const result = [...concat([1, 2], [3, 4], [5])];

		expect(result).toEqual([1, 2, 3, 4, 5]);
	});

	it("should return an empty iterator when called with no arguments", () => {
		const result = [...concat<number>()];

		expect(result).toEqual([]);
	});

	it("should skip empty iterables", () => {
		const result = [...concat([1, 2], [], [3])];

		expect(result).toEqual([1, 2, 3]);
	});

	it("should accept non-array iterables", () => {
		const result = [...concat(new Set([1, 2]), new Set([3]))];

		expect(result).toEqual([1, 2, 3]);
	});

	it("should be lazy", () => {
		let pulled = 0;
		function* source() {
			pulled++;
			yield 1;
		}

		const iterator = concat(source(), source());
		expect(pulled).toBe(0);

		iterator.next();
		expect(pulled).toBe(1);
	});
});
