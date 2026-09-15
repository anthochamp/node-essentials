import { expect, suite, test } from "vitest";

import { LinkedList } from "./linked-list.js";

/**
 * Cursor-specific tests: everything else (get/set/splice/slice, capacity,
 * removeFirst/remove/replaceFirst/replace) is already exercised generically by
 * the `__tests__/*-compliance.test.ts` suites.
 */

suite("LinkedList cursor tests", () => {
	test("should walk the list forward from begin() to an invalid end", () => {
		const list = new LinkedList([1, 2, 3]);
		const cursor = list.begin();

		expect(cursor.valid).toBe(true);
		expect(cursor.value).toBe(1);

		expect(cursor.advance()).toBe(true);
		expect(cursor.value).toBe(2);

		expect(cursor.advance()).toBe(true);
		expect(cursor.value).toBe(3);

		expect(cursor.advance()).toBe(false);
		expect(cursor.valid).toBe(false);
		expect(cursor.value).toBeUndefined();
	});

	test("should report an invalid, valueless cursor for an empty list and for end()", () => {
		const empty = new LinkedList<number>();
		expect(empty.begin().valid).toBe(false);

		const list = new LinkedList([1, 2, 3]);
		const end = list.end();
		expect(end.valid).toBe(false);
		expect(end.value).toBeUndefined();
	});

	test("should position cursorAt an arbitrary index", () => {
		const list = new LinkedList([1, 2, 3, 4]);

		expect(list.cursorAt(0).value).toBe(1);
		expect(list.cursorAt(2).value).toBe(3);
		expect(list.cursorAt(-1).value).toBe(4);
		expect(list.cursorAt(4).valid).toBe(false);
	});

	test("should insertAfter an interior cursor", () => {
		const list = new LinkedList([1, 2, 3]);
		const cursor = list.cursorAt(0);

		list.insertAllAfter(cursor, [10, 20]);

		expect(Array.from(list)).toEqual([1, 10, 20, 2, 3]);
	});

	test("should append via insertAfter(end(), ...), reading the current tail live", () => {
		const list = new LinkedList([1, 2]);

		list.insertAfter(list.end(), 3);
		expect(Array.from(list)).toEqual([1, 2, 3]);

		// A fresh end() cursor after further mutation still appends correctly.
		list.pushBackAll([4]);
		list.insertAfter(list.end(), 5);
		expect(Array.from(list)).toEqual([1, 2, 3, 4, 5]);
	});

	test("should insertAfter into an empty list", () => {
		const list = new LinkedList<number>();

		list.insertAllAfter(list.end(), [1, 2]);

		expect(Array.from(list)).toEqual([1, 2]);
	});

	test("should removeAfter an interior cursor and invalidate cursors at the removed node", () => {
		const list = new LinkedList([1, 2, 3]);
		const cursorAtRemoved = list.cursorAt(1);
		const anchor = list.cursorAt(0);

		expect(list.removeAfter(anchor)).toBe(2);
		expect(Array.from(list)).toEqual([1, 3]);
		expect(cursorAtRemoved.valid).toBe(false);
	});

	test("should return undefined from removeAfter when there is nothing after the cursor", () => {
		const list = new LinkedList([1, 2, 3]);

		expect(list.removeAfter(list.end())).toBeUndefined();
		expect(list.removeAfter(list.cursorAt(2))).toBeUndefined();
		expect(Array.from(list)).toEqual([1, 2, 3]);
	});

	test("should setAt an interior cursor", () => {
		const list = new LinkedList([1, 2, 3]);

		list.setAt(list.cursorAt(1), 20);

		expect(Array.from(list)).toEqual([1, 20, 3]);
	});

	test("should throw setAt on a past-the-end cursor", () => {
		const list = new LinkedList([1, 2, 3]);

		expect(() => list.setAt(list.end(), 10)).toThrow(RangeError);
	});

	test("should throw insertAfter/removeAfter/setAt on a cursor whose element was removed", () => {
		const list = new LinkedList([1, 2, 3]);
		const cursor = list.cursorAt(1);

		list.removeFirst((value) => value === 2);

		expect(cursor.valid).toBe(false);
		expect(() => list.insertAfter(cursor, 10)).toThrow(RangeError);
		expect(() => list.removeAfter(cursor)).toThrow(RangeError);
		expect(() => list.setAt(cursor, 10)).toThrow(RangeError);
	});

	test("should clone a cursor independently", () => {
		const list = new LinkedList([1, 2, 3]);
		const cursor = list.cursorAt(0);
		const clone = cursor.clone();

		clone.advance();

		expect(cursor.value).toBe(1);
		expect(clone.value).toBe(2);
	});
});
