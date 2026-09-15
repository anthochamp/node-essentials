import { expect, suite, test } from "vitest";

import { BitSet } from "./bit-set.js";

suite("BitSet", () => {
	test("should size itself to fit the constructor's members", () => {
		const set = new BitSet([0, 5, 31]);

		expect(set.size).toBe(32);
		expect(set.count()).toBe(3);
		expect(Array.from(set)).toEqual([0, 5, 31]);
	});

	test("should take an explicit size larger than its members", () => {
		const set = new BitSet([1], { size: 100 });

		expect(set.size).toBe(100);
		expect(set.has(99)).toBe(false);
		set.add(99);
		expect(set.has(99)).toBe(true);
	});

	test("should reject a negative or fractional size", () => {
		expect(() => new BitSet(undefined, { size: -1 })).toThrow(RangeError);
		expect(() => new BitSet(undefined, { size: 1.5 })).toThrow(RangeError);
	});

	test("should hold nothing at size 0", () => {
		const set = new BitSet();

		expect(set.size).toBe(0);
		expect(set.count()).toBe(0);
		expect(set.has(0)).toBe(false);
		expect(Array.from(set)).toEqual([]);
	});

	test("should iterate members in ascending order across word boundaries", () => {
		const set = new BitSet([70, 3, 31, 32, 64], { size: 128 });

		expect(Array.from(set)).toEqual([3, 31, 32, 64, 70]);
	});

	test("should deduplicate rather than double-count", () => {
		const set = new BitSet(undefined, { size: 64 });

		set.add(5);
		set.add(5);

		expect(set.count()).toBe(1);
	});

	test("should report whether a delete removed anything", () => {
		const set = new BitSet([5], { size: 64 });

		expect(set.delete(5)).toBe(true);
		expect(set.delete(5)).toBe(false);
		expect(set.count()).toBe(0);
	});

	test("should throw on a mutation outside the universe", () => {
		const set = new BitSet(undefined, { size: 8 });

		expect(() => set.add(8)).toThrow(RangeError);
		expect(() => set.add(-1)).toThrow(RangeError);
		expect(() => set.add(1.5)).toThrow(RangeError);
		expect(() => set.delete(8)).toThrow(RangeError);
	});

	test("should treat an out-of-range query as a miss rather than an error", () => {
		const set = new BitSet(undefined, { size: 8 });

		expect(set.has(8)).toBe(false);
		expect(set.has(-1)).toBe(false);
		expect(set.has(1.5)).toBe(false);
	});

	test("should clear every member", () => {
		const set = new BitSet([1, 2, 3], { size: 64 });

		set.clear();

		expect(set.count()).toBe(0);
		expect(Array.from(set)).toEqual([]);
	});

	suite("rank", () => {
		test("should count members strictly below the bound", () => {
			const set = new BitSet([0, 5, 40, 70], { size: 128 });

			expect(set.rank(0)).toBe(0);
			expect(set.rank(1)).toBe(1);
			expect(set.rank(6)).toBe(2);
			expect(set.rank(41)).toBe(3);
			expect(set.rank(128)).toBe(4);
		});

		test("should agree with count at the universe bound", () => {
			const set = new BitSet([1, 33, 65], { size: 96 });

			expect(set.rank(set.size)).toBe(set.count());
		});

		test("should clamp a bound outside the universe", () => {
			const set = new BitSet([1], { size: 8 });

			expect(set.rank(-5)).toBe(0);
			expect(set.rank(1000)).toBe(1);
		});
	});

	suite("set algebra", () => {
		const left = (): BitSet => new BitSet([1, 2, 3], { size: 64 });

		test("should compute the union", () => {
			expect(
				Array.from(left().union(new BitSet([3, 40], { size: 64 }))),
			).toEqual([1, 2, 3, 40]);
		});

		test("should compute the intersection", () => {
			const result = left().intersection(new BitSet([2, 3, 9], { size: 64 }));

			expect(Array.from(result)).toEqual([2, 3]);
			expect(result.count()).toBe(2);
		});

		test("should compute the difference", () => {
			expect(
				Array.from(left().difference(new BitSet([2], { size: 64 }))),
			).toEqual([1, 3]);
		});

		test("should compute the symmetric difference", () => {
			const result = left().symmetricDifference(
				new BitSet([3, 4], { size: 64 }),
			);

			expect(Array.from(result)).toEqual([1, 2, 4]);
		});

		test("should accept a plain iterable operand", () => {
			expect(Array.from(left().union([9]))).toEqual([1, 2, 3, 9]);
			expect(Array.from(left().intersection([2]))).toEqual([2]);
		});

		test("should combine operands of different sizes", () => {
			const small = new BitSet([1], { size: 8 });
			const large = new BitSet([100], { size: 128 });

			const result = small.union(large);

			expect(result.size).toBe(128);
			expect(Array.from(result)).toEqual([1, 100]);
		});

		test("should answer the containment predicates", () => {
			expect(left().isSubsetOf([1, 2, 3, 4])).toBe(true);
			expect(left().isSubsetOf([1, 2])).toBe(false);

			expect(left().isSupersetOf([1, 2])).toBe(true);
			expect(left().isSupersetOf([1, 9])).toBe(false);

			expect(left().isDisjointFrom([7, 8])).toBe(true);
			expect(left().isDisjointFrom([3])).toBe(false);
		});

		test("should not count a member beyond its universe as contained", () => {
			const small = new BitSet([1], { size: 8 });
			const large = new BitSet([1, 100], { size: 128 });

			expect(large.isSubsetOf(small)).toBe(false);
			expect(small.isSubsetOf(large)).toBe(true);
		});

		test("should not mutate either operand", () => {
			const set = left();

			set.union([9]);
			set.intersection([1]);
			set.difference([1]);

			expect(Array.from(set)).toEqual([1, 2, 3]);
		});
	});
});
