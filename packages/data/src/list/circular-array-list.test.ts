import { expect, suite, test } from "vitest";

import { CircularArrayList } from "./circular-array-list.js";

/**
 * These tests target what is genuinely new in this implementation compared to
 * its `IList` siblings: the wrap-around physical index arithmetic and the
 * growth/re-linearization step. Everything else (get/set/splice/slice bounds,
 * removeFirst/remove/replaceFirst/replace) is already exercised generically by
 * `icollection-compliance.test.ts` and `ilist-compliance.test.ts`.
 */

suite("CircularArrayList", () => {
	test("should wrap around after repeated pushBack/popFront cycles without growing", () => {
		const list = new CircularArrayList<number>();

		for (let round = 0; round < 3; round++) {
			list.pushBackAll([
				round * 10 + 1,
				round * 10 + 2,
				round * 10 + 3,
				round * 10 + 4,
			]);
			expect(Array.from(list)).toEqual([
				round * 10 + 1,
				round * 10 + 2,
				round * 10 + 3,
				round * 10 + 4,
			]);

			expect(list.popFront()).toBe(round * 10 + 1);
			expect(list.popFront()).toBe(round * 10 + 2);
			expect(list.popFront()).toBe(round * 10 + 3);
			expect(list.popFront()).toBe(round * 10 + 4);
			expect(list.count()).toBe(0);
		}
	});

	test("should wrap around after repeated pushFront/popBack cycles without growing", () => {
		const list = new CircularArrayList<number>();

		for (let round = 0; round < 3; round++) {
			// pushFront mirrors Array.prototype.unshift: arguments are inserted in
			// the given order at the front, so the first argument ends up frontmost.
			list.pushFrontAll([
				round * 10 + 1,
				round * 10 + 2,
				round * 10 + 3,
				round * 10 + 4,
			]);
			expect(Array.from(list)).toEqual([
				round * 10 + 1,
				round * 10 + 2,
				round * 10 + 3,
				round * 10 + 4,
			]);

			expect(list.popBack()).toBe(round * 10 + 4);
			expect(list.popBack()).toBe(round * 10 + 3);
			expect(list.popBack()).toBe(round * 10 + 2);
			expect(list.popBack()).toBe(round * 10 + 1);
			expect(list.count()).toBe(0);
		}
	});

	test("should keep the front/back boundary correct while straddling the physical wrap point", () => {
		const list = new CircularArrayList<number>();

		// Rotate head forward by 2 without ever growing or emptying, so the 4
		// occupied slots straddle the physical end of the backing array.
		list.pushBackAll([1, 2, 3, 4]);
		list.popFront();
		list.popFront();
		list.pushBackAll([5, 6]);

		expect(Array.from(list)).toEqual([3, 4, 5, 6]);
		expect(list.front()).toBe(3);
		expect(list.back()).toBe(6);
		expect(list.get(0)).toBe(3);
		expect(list.get(3)).toBe(6);
		expect(list.get(-1)).toBe(6);
	});

	test("should grow and re-linearize while preserving order when head is not 0", () => {
		const list = new CircularArrayList<number>();

		// Force head away from 0 first, then grow past the initial physical length.
		list.pushBackAll([1, 2, 3, 4]);
		list.popFront();
		list.popFront();

		for (let value = 5; value <= 30; value++) {
			list.pushBackAll([value]);
		}

		const expected: number[] = [3, 4];
		for (let value = 5; value <= 30; value++) {
			expected.push(value);
		}

		expect(Array.from(list)).toEqual(expected);
		expect(list.count()).toBe(expected.length);
	});

	test("should splice an interior range correctly after wraparound, growing and shrinking", () => {
		const list = new CircularArrayList<number>();

		list.pushBackAll([1, 2, 3, 4]);
		list.popFront();
		list.popFront();
		list.pushBackAll([5, 6]);
		// Logical content: [3, 4, 5, 6], head is non-zero here.

		const removed = Array.from(list.spliceAll(1, 2, [40, 41, 42]));
		expect(removed).toEqual([4, 5]);
		expect(Array.from(list)).toEqual([3, 40, 41, 42, 6]);

		const removedShrink = Array.from(list.splice(1, 3));
		expect(removedShrink).toEqual([40, 41, 42]);
		expect(Array.from(list)).toEqual([3, 6]);
	});

	test("should apply removeFirst/remove/replaceFirst/replace correctly after wraparound", () => {
		const list = new CircularArrayList<number>();

		list.pushBackAll([1, 2, 3, 4]);
		list.popFront();
		list.pushBackAll([5]);
		// Logical content: [2, 3, 4, 5], head is non-zero here.

		expect(list.removeFirst((value) => value === 3)).toBe(true);
		expect(Array.from(list)).toEqual([2, 4, 5]);

		list.pushFrontAll([3]);
		// Logical content: [3, 2, 4, 5]
		expect(Array.from(list.remove((value) => value % 2 === 0))).toEqual([2, 4]);
		expect(Array.from(list)).toEqual([3, 5]);

		expect(list.replaceFirst((value) => value === 5, 50)).toBe(true);
		expect(Array.from(list)).toEqual([3, 50]);

		expect(
			Array.from(
				list.replace(
					(value) => value > 0,
					(value) => value * 2,
				),
			),
		).toEqual([3, 50]);
		expect(Array.from(list)).toEqual([6, 100]);
	});
});
