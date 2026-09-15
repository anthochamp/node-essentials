import { expect, suite, test } from "vitest";

import { DoublyLinkedList } from "./doubly-linked-list.js";

/**
 * Cursor-specific tests: everything else (get/set/splice/slice, capacity,
 * removeFirst/remove/replaceFirst/replace) is already exercised generically by
 * the `__tests__/*-compliance.test.ts` suites.
 */

suite("DoublyLinkedList cursor tests", () => {
	test("should walk forward and backward between begin() and end()", () => {
		const list = new DoublyLinkedList([1, 2, 3]);
		const cursor = list.begin();

		expect(cursor.value).toBe(1);
		expect(cursor.advance()).toBe(true);
		expect(cursor.value).toBe(2);
		expect(cursor.advance()).toBe(true);
		expect(cursor.value).toBe(3);
		expect(cursor.advance()).toBe(false);
		expect(cursor.valid).toBe(false);

		expect(cursor.retreat()).toBe(true);
		expect(cursor.value).toBe(3);
		expect(cursor.retreat()).toBe(true);
		expect(cursor.value).toBe(2);
		expect(cursor.retreat()).toBe(true);
		expect(cursor.value).toBe(1);
		expect(cursor.retreat()).toBe(false);
		expect(cursor.value).toBe(1);
	});

	test("should fail to retreat past the first element on an empty list's end()", () => {
		const list = new DoublyLinkedList<number>();

		expect(list.end().retreat()).toBe(false);
	});

	test("should position cursorAt an arbitrary index", () => {
		const list = new DoublyLinkedList([1, 2, 3, 4]);

		expect(list.cursorAt(0).value).toBe(1);
		expect(list.cursorAt(2).value).toBe(3);
		expect(list.cursorAt(-1).value).toBe(4);
		expect(list.cursorAt(4).valid).toBe(false);
	});

	test("should insertAfter/insertBefore an interior cursor", () => {
		const list = new DoublyLinkedList([1, 2, 3]);

		list.insertAfter(list.cursorAt(0), 10);
		expect(Array.from(list)).toEqual([1, 10, 2, 3]);

		list.insertBefore(list.cursorAt(2), 20);
		expect(Array.from(list)).toEqual([1, 10, 20, 2, 3]);
	});

	test("should append via insertAfter(end(), ...) and insertBefore(end(), ...), reading the tail live", () => {
		const list = new DoublyLinkedList([1, 2]);

		list.insertAfter(list.end(), 3);
		expect(Array.from(list)).toEqual([1, 2, 3]);

		list.pushBackAll([4]);
		list.insertBefore(list.end(), 5);
		expect(Array.from(list)).toEqual([1, 2, 3, 4, 5]);
	});

	test("should prepend via insertBefore(begin(), ...)", () => {
		const list = new DoublyLinkedList([2, 3]);

		list.insertAllBefore(list.begin(), [0, 1]);

		expect(Array.from(list)).toEqual([0, 1, 2, 3]);
	});

	test("should insertAfter/insertBefore into an empty list", () => {
		const list = new DoublyLinkedList<number>();

		list.insertAllAfter(list.end(), [1, 2]);

		expect(Array.from(list)).toEqual([1, 2]);
	});

	test("should removeAfter/removeAt an interior cursor and invalidate cursors at the removed node", () => {
		const list = new DoublyLinkedList([1, 2, 3, 4]);
		const cursorAtRemovedByAfter = list.cursorAt(1);
		const cursorAtRemovedByAt = list.cursorAt(3);

		expect(list.removeAfter(list.cursorAt(0))).toBe(2);
		expect(Array.from(list)).toEqual([1, 3, 4]);
		expect(cursorAtRemovedByAfter.valid).toBe(false);

		expect(list.removeAt(list.cursorAt(2))).toBe(4);
		expect(Array.from(list)).toEqual([1, 3]);
		expect(cursorAtRemovedByAt.valid).toBe(false);
	});

	test("should return undefined from removeAfter/removeAt when there is nothing there", () => {
		const list = new DoublyLinkedList([1, 2, 3]);

		expect(list.removeAfter(list.end())).toBeUndefined();
		expect(list.removeAfter(list.cursorAt(2))).toBeUndefined();
		expect(list.removeAt(list.end())).toBeUndefined();
		expect(Array.from(list)).toEqual([1, 2, 3]);
	});

	test("should setAt an interior cursor", () => {
		const list = new DoublyLinkedList([1, 2, 3]);

		list.setAt(list.cursorAt(1), 20);

		expect(Array.from(list)).toEqual([1, 20, 3]);
	});

	test("should throw setAt on a past-the-end cursor", () => {
		const list = new DoublyLinkedList([1, 2, 3]);

		expect(() => list.setAt(list.end(), 10)).toThrow(RangeError);
	});

	test("should throw insertAfter/insertBefore/removeAfter/removeAt/setAt on a cursor whose element was removed", () => {
		const list = new DoublyLinkedList([1, 2, 3]);
		const cursor = list.cursorAt(1);

		list.removeFirst((value) => value === 2);

		expect(cursor.valid).toBe(false);
		expect(() => list.insertAfter(cursor, 10)).toThrow(RangeError);
		expect(() => list.insertBefore(cursor, 10)).toThrow(RangeError);
		expect(() => list.removeAfter(cursor)).toThrow(RangeError);
		expect(() => list.removeAt(cursor)).toThrow(RangeError);
		expect(() => list.setAt(cursor, 10)).toThrow(RangeError);
	});

	test("should clone a cursor independently, in both directions", () => {
		const list = new DoublyLinkedList([1, 2, 3]);
		const cursor = list.cursorAt(1);
		const clone = cursor.clone();

		clone.advance();

		expect(cursor.value).toBe(2);
		expect(clone.value).toBe(3);

		cursor.retreat();
		expect(cursor.value).toBe(1);
		expect(clone.value).toBe(3);
	});
});
