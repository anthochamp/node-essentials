import { expect, suite, test } from "vitest";

import { BitVector } from "./bit-vector.js";

suite("BitVector", () => {
	test("should grow to accept any non-negative member", () => {
		const vector = new BitVector();

		vector.add(1000);

		expect(vector.has(1000)).toBe(true);
		expect(vector.count()).toBe(1);
		expect(vector.size).toBeGreaterThan(1000);
	});

	test("should reject a negative or fractional member", () => {
		const vector = new BitVector();

		expect(() => vector.add(-1)).toThrow(RangeError);
		expect(() => vector.add(1.5)).toThrow(RangeError);
	});

	test("should treat an out-of-range query as a miss", () => {
		const vector = new BitVector();

		expect(vector.has(10_000)).toBe(false);
		expect(vector.has(-1)).toBe(false);
		expect(vector.delete(10_000)).toBe(false);
	});

	test("should accept an initial iterable", () => {
		const vector = new BitVector([3, 1, 100]);

		expect(Array.from(vector)).toEqual([1, 3, 100]);
		expect(vector.count()).toBe(3);
	});

	test("should deduplicate rather than double-count", () => {
		const vector = new BitVector();

		vector.add(5);
		vector.add(5);

		expect(vector.count()).toBe(1);
	});

	test("should report whether a delete removed anything", () => {
		const vector = new BitVector([5]);

		expect(vector.delete(5)).toBe(true);
		expect(vector.delete(5)).toBe(false);
		expect(vector.count()).toBe(0);
	});

	test("should keep its capacity after clearing", () => {
		const vector = new BitVector([1000]);
		const size = vector.size;

		vector.clear();

		expect(vector.count()).toBe(0);
		expect(vector.size).toBe(size);
		expect(Array.from(vector)).toEqual([]);
	});

	test("should keep its capacity after deleting its largest member", () => {
		const vector = new BitVector([1000]);
		const size = vector.size;

		vector.delete(1000);

		expect(vector.size).toBe(size);
	});

	test("should iterate ascending across word boundaries", () => {
		const vector = new BitVector([200, 31, 32, 0]);

		expect(Array.from(vector)).toEqual([0, 31, 32, 200]);
	});

	test("should count members below a bound", () => {
		const vector = new BitVector([0, 5, 40, 70]);

		expect(vector.rank(0)).toBe(0);
		expect(vector.rank(6)).toBe(2);
		expect(vector.rank(vector.size)).toBe(vector.count());
	});

	suite("set algebra", () => {
		const left = (): BitVector => new BitVector([1, 2, 3]);

		test("should compute the union", () => {
			expect(Array.from(left().union([3, 500]))).toEqual([1, 2, 3, 500]);
		});

		test("should compute the intersection", () => {
			expect(Array.from(left().intersection([2, 3, 9]))).toEqual([2, 3]);
		});

		test("should compute the difference", () => {
			expect(Array.from(left().difference([2]))).toEqual([1, 3]);
		});

		test("should compute the symmetric difference", () => {
			expect(Array.from(left().symmetricDifference([3, 4]))).toEqual([1, 2, 4]);
		});

		test("should return a vector that still grows", () => {
			const result = left().union([5]);

			result.add(100_000);

			expect(result.has(100_000)).toBe(true);
		});

		test("should answer the containment predicates", () => {
			expect(left().isSubsetOf([1, 2, 3, 4])).toBe(true);
			expect(left().isSubsetOf([1, 2])).toBe(false);
			expect(left().isSupersetOf([1, 2])).toBe(true);
			expect(left().isSupersetOf([9])).toBe(false);
			expect(left().isDisjointFrom([9])).toBe(true);
			expect(left().isDisjointFrom([1])).toBe(false);
		});

		test("should not mutate either operand", () => {
			const vector = left();

			vector.union([9]);
			vector.difference([1]);

			expect(Array.from(vector)).toEqual([1, 2, 3]);
		});

		test("should handle operands of very different magnitudes", () => {
			const small = new BitVector([1]);
			const large = new BitVector([100_000]);

			expect(Array.from(small.union(large))).toEqual([1, 100_000]);
			expect(Array.from(small.intersection(large))).toEqual([]);
			expect(small.isDisjointFrom(large)).toBe(true);
		});
	});
});
