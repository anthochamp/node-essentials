import { expect, suite, test } from "vitest";

import { LruCache } from "./lru-cache.js";

suite("LruCache", () => {
	test("should reject a negative or fractional capacity", () => {
		expect(() => new LruCache<number>(undefined, { capacity: -1 })).toThrow(
			RangeError,
		);
		expect(() => new LruCache<number>(undefined, { capacity: 1.5 })).toThrow(
			RangeError,
		);
	});

	test("should hold items up to the capacity without evicting", () => {
		const cache = new LruCache<number>(undefined, { capacity: 3 });

		expect(cache.add(1)).toEqual([]);
		expect(cache.add(2)).toEqual([]);
		expect(cache.add(3)).toEqual([]);

		expect(cache.count()).toBe(3);
		expect(cache.has(1)).toBe(true);
	});

	test("should evict the least recently used item when full", () => {
		const cache = new LruCache<number>([1, 2, 3], { capacity: 3 });

		expect(cache.add(4)).toEqual([1]);

		expect(cache.has(1)).toBe(false);
		expect(cache.count()).toBe(3);
		expect(Array.from(cache)).toEqual([4, 3, 2]);
	});

	test("should not count has() as a use", () => {
		const cache = new LruCache<number>([1, 2, 3], { capacity: 3 });

		cache.has(1);

		// 1 is still the oldest: a membership test must not reshuffle the order.
		expect(cache.add(4)).toEqual([1]);
	});

	test("should count touch() as a use, sparing the touched item", () => {
		const cache = new LruCache<number>([1, 2, 3], { capacity: 3 });

		expect(cache.touch(1)).toBe(true);

		expect(cache.add(4)).toEqual([2]);
		expect(cache.has(1)).toBe(true);
	});

	test("should report a touch of an absent item without inserting it", () => {
		const cache = new LruCache<number>([1], { capacity: 3 });

		expect(cache.touch(99)).toBe(false);
		expect(cache.count()).toBe(1);
	});

	test("should count re-adding a held item as a use", () => {
		const cache = new LruCache<number>([1, 2, 3], { capacity: 3 });

		expect(cache.add(1)).toEqual([]);
		expect(cache.count()).toBe(3);

		expect(cache.add(4)).toEqual([2]);
	});

	test("should expose the next eviction victim", () => {
		const cache = new LruCache<number>(undefined, { capacity: 2 });

		expect(cache.lru()).toBeUndefined();

		cache.add(1);
		cache.add(2);

		expect(cache.lru()).toBe(1);

		cache.touch(1);
		expect(cache.lru()).toBe(2);
	});

	test("should report every eviction from a batch, in order", () => {
		const cache = new LruCache<number>(undefined, { capacity: 2 });

		expect(cache.addAll([1, 2, 3, 4])).toEqual([1, 2]);
		expect(Array.from(cache)).toEqual([4, 3]);
	});

	test("should hold nothing at capacity 0, displacing each incoming item", () => {
		const cache = new LruCache<number>(undefined, { capacity: 0 });

		expect(cache.add(1)).toEqual([1]);
		expect(cache.count()).toBe(0);
		expect(cache.has(1)).toBe(false);
	});

	test("should delete in O(1) without a tombstone", () => {
		const cache = new LruCache<number>([1, 2, 3], { capacity: 3 });

		expect(cache.delete(2)).toBe(true);
		expect(cache.delete(2)).toBe(false);

		expect(cache.count()).toBe(2);
		expect(Array.from(cache)).toEqual([3, 1]);

		// The freed room is usable again, and the order survived the removal.
		expect(cache.add(4)).toEqual([]);
		expect(cache.add(5)).toEqual([1]);
	});

	test("should delete the most and least recently used without corrupting the list", () => {
		const cache = new LruCache<number>([1, 2, 3], { capacity: 3 });

		expect(cache.delete(3)).toBe(true);
		expect(cache.delete(1)).toBe(true);

		expect(Array.from(cache)).toEqual([2]);
		expect(cache.lru()).toBe(2);
	});

	test("should clear every item", () => {
		const cache = new LruCache<number>([1, 2, 3], { capacity: 3 });

		cache.clear();

		expect(cache.count()).toBe(0);
		expect(cache.lru()).toBeUndefined();
		expect(Array.from(cache)).toEqual([]);
	});

	suite("set algebra", () => {
		test("should answer over the held items, returning an unbounded set", () => {
			const cache = new LruCache<number>([1, 2], { capacity: 2 });

			const united = cache.union([3, 4, 5]);

			// An LruCache result would have evicted down to 2; a set does not.
			expect(united.count()).toBe(5);
			expect(Array.from(cache)).toEqual([2, 1]);
		});

		test("should answer the containment predicates", () => {
			const cache = new LruCache<number>([1, 2], { capacity: 2 });

			expect(cache.isSubsetOf([1, 2, 3])).toBe(true);
			expect(cache.isSupersetOf([1])).toBe(true);
			expect(cache.isSupersetOf([3])).toBe(false);
			expect(cache.isDisjointFrom([3])).toBe(true);
			expect(cache.isDisjointFrom([1])).toBe(false);
		});

		test("should not count the algebra as a use", () => {
			const cache = new LruCache<number>([1, 2], { capacity: 2 });

			cache.intersection([1]);
			cache.isSupersetOf([1]);

			expect(cache.lru()).toBe(1);
		});
	});
});
