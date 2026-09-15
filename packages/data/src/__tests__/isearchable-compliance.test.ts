import type { Callable } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { ISearchable } from "../collection/isearchable.js";
import { ArrayList } from "../list/array-list.js";
import { CircularArrayList } from "../list/circular-array-list.js";
import { DoublyLinkedList } from "../list/doubly-linked-list.js";
import { LinkedList } from "../list/linked-list.js";

/**
 * ISearchable compliance tests for the four `IList` implementations.
 *
 * These tests ensure that the data structures adhere to the ISearchable
 * interface.
 */

suite.each<{
	description: string;
	factory: Callable<
		[iterator?: Iterable<number>],
		ISearchable<number> & Iterable<number>
	>;
}>([
	{
		description: "DoublyLinkedList",
		factory: (iterator) => new DoublyLinkedList(iterator),
	},
	{
		description: "LinkedList",
		factory: (iterator) => new LinkedList(iterator),
	},
	{
		description: "ArrayList",
		factory: (iterator) => new ArrayList(iterator),
	},
	{
		description: "CircularArrayList",
		factory: (iterator) => new CircularArrayList(iterator),
	},
])("$description ISearchable compliance", ({ factory }) => {
	test("should remove the first matching item", () => {
		const list = factory([1, 2, 3, 4, 5]);

		const removedItem = list.removeFirst((item) => item % 2 === 0);
		expect(removedItem).toBe(true);

		const items = Array.from(list);
		expect(items.length).toBe(4);
		expect(items).toEqual(expect.arrayContaining([1, 3, 5]));

		const evenItems = items.filter((item) => item % 2 === 0);
		expect(evenItems.length).toBe(1);
		expect(evenItems[0]).toBeOneOf([2, 4]);
	});

	test("should remove all matching items", () => {
		const list = factory([1, 2, 3, 4, 5]);

		const removedItems = Array.from(list.remove((item) => item % 2 === 0));
		expect(removedItems).toEqual(expect.arrayContaining([2, 4]));

		const items = Array.from(list);
		expect(items.length).toBe(3);
		expect(items).toEqual(expect.arrayContaining([1, 3, 5]));
	});

	test("should replace the first matching item", () => {
		const list = factory([1, 2, 3, 4, 5]);

		const replaced = list.replaceFirst((item) => item % 2 === 0, 20);
		expect(replaced).toBe(true);

		const items = Array.from(list);
		expect(items).toEqual(expect.arrayContaining([1, 3, 5, 20]));

		const evenItems = items.filter((item) => item % 2 === 0 && item !== 20);
		expect(evenItems.length).toBe(1);
		expect(evenItems[0]).toBeOneOf([2, 4]);
	});

	test("should replace all matching items", () => {
		const list = factory([1, 2, 3, 4, 5]);

		const replacedItems = Array.from(
			list.replace(
				(item) => item % 2 === 0,
				() => 20,
			),
		);
		expect(replacedItems).toEqual(expect.arrayContaining([2, 4]));

		const items = Array.from(list);
		expect(items.length).toBe(5);
		expect(items).toEqual(expect.arrayContaining([1, 20, 3, 20, 5]));
	});
});
