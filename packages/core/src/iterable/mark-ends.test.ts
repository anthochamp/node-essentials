import { describe, expect, it } from "vitest";

import { markEnds } from "./mark-ends.js";

describe("markEnds", () => {
	it("should tag the first and last elements", () => {
		expect([...markEnds([1, 2, 3])]).toEqual([
			[1, true, false],
			[2, false, false],
			[3, false, true],
		]);
	});

	it("should tag a lone element as both first and last", () => {
		expect([...markEnds([1])]).toEqual([[1, true, true]]);
	});

	it("should yield nothing for an empty iterable", () => {
		expect([...markEnds([])]).toEqual([]);
	});

	it("should tag both elements of a pair", () => {
		expect([...markEnds([1, 2])]).toEqual([
			[1, true, false],
			[2, false, true],
		]);
	});

	it("should accept non-array iterables", () => {
		expect([...markEnds(new Set(["a", "b"]))]).toEqual([
			["a", true, false],
			["b", false, true],
		]);
	});

	it("should run one element ahead of what it yields", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		const iterator = markEnds(counted());
		iterator.next();

		expect(produced).toBe(2);
	});

	it("should mark exactly one first and one last", () => {
		const marked = [...markEnds([1, 2, 3, 4])];

		expect(marked.filter(([, isFirst]) => isFirst)).toHaveLength(1);
		expect(marked.filter(([, , isLast]) => isLast)).toHaveLength(1);
	});
});
