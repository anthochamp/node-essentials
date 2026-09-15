import { describe, expect, it } from "vitest";

import { pairwise } from "./pairwise.js";

describe("pairwise", () => {
	it("should yield each consecutive overlapping pair", () => {
		expect([...pairwise([1, 2, 3, 4])]).toEqual([
			[1, 2],
			[2, 3],
			[3, 4],
		]);
	});

	it("should yield one pair for two elements", () => {
		expect([...pairwise([1, 2])]).toEqual([[1, 2]]);
	});

	it("should yield nothing for fewer than two elements", () => {
		expect([...pairwise([1])]).toEqual([]);
		expect([...pairwise([])]).toEqual([]);
	});

	it("should overlap rather than partition, unlike chunk", () => {
		expect([...pairwise([1, 2, 3])]).toEqual([
			[1, 2],
			[2, 3],
		]);
	});

	it("should accept non-array iterables", () => {
		expect([...pairwise(new Set(["a", "b", "c"]))]).toEqual([
			["a", "b"],
			["b", "c"],
		]);
	});

	it("should not treat undefined elements as absent", () => {
		expect([...pairwise([undefined, undefined])]).toEqual([
			[undefined, undefined],
		]);
	});

	it("should be lazy — it pulls one element per pair after the first", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		const iterator = pairwise(counted());
		iterator.next();

		expect(produced).toBe(2);

		iterator.next();

		expect(produced).toBe(3);
	});
});
