import { expect, suite, test } from "vitest";

import { EnhancedSet } from "./enhanced-set.js";

type Point = { x: number; y: number };

const byCoordinates = (a: Point, b: Point): boolean =>
	a.x === b.x && a.y === b.y;

const sorted = (set: Iterable<number>): number[] =>
	Array.from(set).sort((a, b) => a - b);

test("should default to sameValueZero, matching native Set", () => {
	const set = new EnhancedSet<number>([1, 2, 2, 3]);

	expect(set.count()).toBe(3);
	expect(set.has(2)).toBe(true);
	expect(set.has(4)).toBe(false);
});

test("should treat NaN as equal to itself under sameValueZero", () => {
	const set = new EnhancedSet<number>([Number.NaN, Number.NaN]);

	expect(set.count()).toBe(1);
	expect(set.has(Number.NaN)).toBe(true);
});

test("should treat -0 and +0 as the same under sameValueZero", () => {
	const set = new EnhancedSet<number>([0, -0]);

	expect(set.count()).toBe(1);
});

test("should separate -0 from +0 under sameValue", () => {
	const set = new EnhancedSet<number>([0, -0], {
		comparisonStrategy: "sameValue",
	});

	expect(set.count()).toBe(2);
});

test("should deduplicate structurally under a caller-supplied equality", () => {
	const set = new EnhancedSet<Point>(
		[
			{ x: 1, y: 2 },
			{ x: 1, y: 2 },
			{ x: 3, y: 4 },
		],
		{ comparisonStrategy: byCoordinates },
	);

	expect(set.count()).toBe(2);
	expect(set.has({ x: 3, y: 4 })).toBe(true);
	expect(set.has({ x: 9, y: 9 })).toBe(false);
});

test("should delete by the caller's equality, not by reference", () => {
	const set = new EnhancedSet<Point>([{ x: 1, y: 2 }], {
		comparisonStrategy: byCoordinates,
	});

	expect(set.delete({ x: 1, y: 2 })).toBe(true);
	expect(set.count()).toBe(0);
	expect(set.delete({ x: 1, y: 2 })).toBe(false);
});

test("should keep every remaining element when deleting from the middle", () => {
	const set = new EnhancedSet<number>([1, 2, 3, 4, 5]);

	expect(set.delete(3)).toBe(true);

	expect(sorted(set)).toEqual([1, 2, 4, 5]);
	expect(set.count()).toBe(4);
});

test("should clear every element", () => {
	const set = new EnhancedSet<number>([1, 2, 3]);

	set.clear();

	expect(set.count()).toBe(0);
	expect(Array.from(set)).toEqual([]);
});

test("should addAll from another set without materialising it", () => {
	const set = new EnhancedSet<number>([1]);

	set.addAll(new Set([2, 3, 1]));

	expect(sorted(set)).toEqual([1, 2, 3]);
});

suite("set algebra", () => {
	const left = (): EnhancedSet<number> => new EnhancedSet([1, 2, 3]);

	test("should compute the union", () => {
		expect(sorted(left().union([3, 4]))).toEqual([1, 2, 3, 4]);
	});

	test("should compute the intersection", () => {
		expect(sorted(left().intersection([2, 3, 9]))).toEqual([2, 3]);
	});

	test("should compute the difference", () => {
		expect(sorted(left().difference([2]))).toEqual([1, 3]);
	});

	test("should compute the symmetric difference", () => {
		expect(sorted(left().symmetricDifference([3, 4]))).toEqual([1, 2, 4]);
	});

	test("should answer the containment predicates", () => {
		expect(left().isSubsetOf([1, 2, 3, 4])).toBe(true);
		expect(left().isSubsetOf([1, 2])).toBe(false);

		expect(left().isSupersetOf([1, 2])).toBe(true);
		expect(left().isSupersetOf([1, 9])).toBe(false);

		expect(left().isDisjointFrom([7, 8])).toBe(true);
		expect(left().isDisjointFrom([3])).toBe(false);
	});

	test("should treat the empty set as a subset of and disjoint from anything", () => {
		const empty = new EnhancedSet<number>();

		expect(empty.isSubsetOf([1])).toBe(true);
		expect(empty.isDisjointFrom([1])).toBe(true);
		expect(empty.isSupersetOf([])).toBe(true);
		expect(empty.isSupersetOf([1])).toBe(false);
	});

	test("should carry this set's equality into every derived set", () => {
		const set = new EnhancedSet<Point>([{ x: 1, y: 2 }], {
			comparisonStrategy: byCoordinates,
		});

		const united = set.union([{ x: 1, y: 2 }]);

		expect(united.count()).toBe(1);
		// A default-equality set would have kept both, then failed this lookup.
		expect(united.has({ x: 1, y: 2 })).toBe(true);
	});

	test("should not mutate either operand", () => {
		const set = left();

		set.union([4]);
		set.intersection([1]);
		set.difference([1]);
		set.symmetricDifference([4]);

		expect(sorted(set)).toEqual([1, 2, 3]);
	});
});
