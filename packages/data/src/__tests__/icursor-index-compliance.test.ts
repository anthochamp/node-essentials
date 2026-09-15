import type { Callable } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { IBidirectionalCursorSequence } from "../cursor/ibidirectional-cursor-sequence.js";
import { IRandomAccessCursor } from "../cursor/irandom-access-cursor.js";
import { ArrayList } from "../list/array-list.js";
import { CircularArrayList } from "../list/circular-array-list.js";

/**
 * Compliance tests for the `IRandomAccessCursor`/`IBidirectionalCursorSequence`
 * pair shared by `ArrayList` and `CircularArrayList`
 * (`_index-cursor-sequence.ts`).
 *
 * The behaviour under test here is specifically what an index-based,
 * auto-adjusting cursor must get right that a node-based one (`LinkedList`,
 * `DoublyLinkedList`) does not need to: a cursor's index tracking insertions/
 * removals that happen elsewhere in the same list, and `end()` continuing to
 * track the current count rather than a value frozen at acquisition time.
 */
suite.each<{
	description: string;
	factory: Callable<
		[iterator?: Iterable<number>],
		IBidirectionalCursorSequence<number, IRandomAccessCursor<number>> &
			Iterable<number>
	>;
}>([
	{
		description: "ArrayList",
		factory: (iterator) => new ArrayList(iterator),
	},
	{
		description: "CircularArrayList",
		factory: (iterator) => new CircularArrayList(iterator),
	},
])("$description index cursor compliance", ({ factory }) => {
	test("should walk forward and backward between begin() and end()", () => {
		const list = factory([1, 2, 3]);
		const cursor = list.begin();

		expect(cursor.index).toBe(0);
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
		expect(cursor.retreat()).toBe(true);
		expect(cursor.value).toBe(1);
		expect(cursor.retreat()).toBe(false);
		expect(cursor.value).toBe(1);
	});

	test("should seek to an arbitrary index, including negative", () => {
		const list = factory([1, 2, 3, 4]);
		const cursor = list.begin();

		expect(cursor.seek(2)).toBe(true);
		expect(cursor.value).toBe(3);
		expect(cursor.seek(-1)).toBe(true);
		expect(cursor.value).toBe(4);
		expect(cursor.seek(4)).toBe(false);
		expect(cursor.valid).toBe(false);
		expect(cursor.seek(10)).toBe(false);
	});

	test("should shift an unrelated cursor's index when items are inserted before it", () => {
		const list = factory([1, 2, 3]);
		const cursor = list.cursorAt(2);

		expect(cursor.value).toBe(3);

		list.insertAllBefore(list.cursorAt(0), [0, -1]);

		expect(cursor.index).toBe(4);
		expect(cursor.value).toBe(3);
	});

	test("should insert nothing for an empty insertAllAfter/insertAllBefore", () => {
		const list = factory([1, 2, 3]);

		list.insertAllAfter(list.cursorAt(0), []);
		list.insertAllBefore(list.cursorAt(0), []);

		expect(Array.from(list)).toEqual([1, 2, 3]);
	});

	test("should shift an unrelated cursor's index when items before it are removed", () => {
		const list = factory([1, 2, 3, 4]);
		const cursor = list.cursorAt(3);

		expect(cursor.value).toBe(4);

		list.removeAt(list.cursorAt(0));

		expect(cursor.index).toBe(2);
		expect(cursor.value).toBe(4);
	});

	test("should leave a cursor after the mutation point untouched", () => {
		const list = factory([1, 2, 3, 4]);
		const before = list.cursorAt(0);

		list.removeAt(list.cursorAt(3));

		expect(before.index).toBe(0);
		expect(before.value).toBe(1);
	});

	test("should permanently invalidate a cursor whose own element was removed", () => {
		const list = factory([1, 2, 3]);
		const cursor = list.cursorAt(1);

		list.removeAt(cursor);

		expect(cursor.valid).toBe(false);
		expect(cursor.value).toBeUndefined();
		expect(cursor.advance()).toBe(false);
		expect(cursor.retreat()).toBe(false);
		expect(cursor.seek(0)).toBe(false);
	});

	test("should throw insertAfter/insertBefore/removeAfter/removeAt/setAt on a cursor whose element was removed", () => {
		const list = factory([1, 2, 3]);
		const cursor = list.cursorAt(1);

		list.removeAt(list.cursorAt(1));

		expect(() => list.insertAfter(cursor, 10)).toThrow(RangeError);
		expect(() => list.insertBefore(cursor, 10)).toThrow(RangeError);
		expect(() => list.removeAfter(cursor)).toThrow(RangeError);
		expect(() => list.removeAt(cursor)).toThrow(RangeError);
		expect(() => list.setAt(cursor, 10)).toThrow(RangeError);
	});

	test("should keep end() tracking the current count through further mutations", () => {
		const list = factory([1, 2]);
		const end = list.end();

		expect(end.valid).toBe(false);
		expect(end.index).toBe(2);

		list.insertAfter(list.cursorAt(1), 3);

		expect(end.index).toBe(3);
		expect(end.valid).toBe(false);

		const clone = end.clone();
		expect(clone.retreat()).toBe(true);
		expect(clone.value).toBe(3);
	});

	test("should insertAfter/insertBefore/removeAfter/removeAt/setAt via cursors", () => {
		const list = factory([1, 2, 3]);

		list.insertAfter(list.cursorAt(0), 10);
		expect(Array.from(list)).toEqual([1, 10, 2, 3]);

		list.insertBefore(list.cursorAt(3), 20);
		expect(Array.from(list)).toEqual([1, 10, 2, 20, 3]);

		expect(list.removeAfter(list.cursorAt(0))).toBe(10);
		expect(Array.from(list)).toEqual([1, 2, 20, 3]);

		expect(list.removeAt(list.cursorAt(1))).toBe(2);
		expect(Array.from(list)).toEqual([1, 20, 3]);

		list.setAt(list.cursorAt(1), 200);
		expect(Array.from(list)).toEqual([1, 200, 3]);
	});

	test("should append via insertAfter(end(), ...) and insertBefore(end(), ...)", () => {
		const list = factory([1, 2]);

		list.insertAfter(list.end(), 3);
		expect(Array.from(list)).toEqual([1, 2, 3]);

		list.insertBefore(list.end(), 4);
		expect(Array.from(list)).toEqual([1, 2, 3, 4]);
	});

	test("should clone a cursor independently", () => {
		const list = factory([1, 2, 3]);
		const cursor = list.cursorAt(0);
		const clone = cursor.clone();

		clone.advance();

		expect(cursor.value).toBe(1);
		expect(clone.value).toBe(2);

		list.insertBefore(list.cursorAt(0), 0);

		expect(cursor.value).toBe(1);
		expect(clone.value).toBe(2);
	});
});
