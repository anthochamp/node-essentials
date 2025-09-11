import { describe, expect, it } from "vitest";
import type { Callable } from "../../ecma/function/types.js";
import type { MaybeAsyncIterableIterator } from "../../ecma/iterator/types.js";
import type { IList } from "../abstract-types/ilist.js";
import { DoublyLinkedList } from "../doubly-linked-list.js";
import { LinkedList } from "../linked-list.js";
import { NativeArray } from "../native-array.js";

describe.each<{
	description: string;
	factory: Callable<[iterator?: Iterable<number>], IList<number>>;
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
		description: "NativeList",
		factory: (iterator) => new NativeArray(iterator),
	},
])("$description IList compliance", ({ factory }) => {
	it("should get items by index", async () => {
		const list: IList<number> = factory([1, 2, 3]);
		expect(await list.get(0)).toBe(1);
		expect(await list.get(1)).toBe(2);
		expect(await list.get(2)).toBe(3);
		expect(await list.get(-1)).toBe(3);
		expect(await list.get(-2)).toBe(2);
		expect(await list.get(-3)).toBe(1);
		expect(await list.get(3)).toBeUndefined();
		expect(await list.get(-4)).toBeUndefined();
	});

	it("should set items by index", async () => {
		const list: IList<number> = factory([1, 2, 3]);
		await list.set(0, 4);
		await list.set(1, 5);
		await list.set(2, 6);
		expect(await Array.fromAsync(list)).toEqual([4, 5, 6]);
		await list.set(-1, 3);
		await list.set(-2, 2);
		await list.set(-3, 1);
		expect(await Array.fromAsync(list)).toEqual([1, 2, 3]);
		await expect(async () => await list.set(-4, 0)).rejects.toThrow(RangeError);
	});

	it("should append an item to the list if index equals to the list size", async () => {
		const list: IList<number> = factory([1, 2, 3]);
		await list.set(3, 4);
		expect(await Array.fromAsync(list)).toEqual([1, 2, 3, 4]);
		await list.set(4, 5);
		expect(await Array.fromAsync(list)).toEqual([1, 2, 3, 4, 5]);
	});

	it("should splice items", async () => {
		const list: IList<number> = factory([1, 2, 3, 4, 5]);
		let removed: MaybeAsyncIterableIterator<number>;

		removed = await list.splice(1, 2, 6, 7);
		expect(await Array.fromAsync(removed)).toEqual([2, 3]);
		expect(await Array.fromAsync(list)).toEqual([1, 6, 7, 4, 5]);
		expect(await list.count()).toBe(5);

		removed = await list.splice(-2, 1, 8, 9);
		expect(await Array.fromAsync(removed)).toEqual([4]);
		expect(await Array.fromAsync(list)).toEqual([1, 6, 7, 8, 9, 5]);
		expect(await list.count()).toBe(6);

		removed = await list.splice(4, 10);
		expect(await Array.fromAsync(removed)).toEqual([9, 5]);
		expect(await Array.fromAsync(list)).toEqual([1, 6, 7, 8]);
		expect(await list.count()).toBe(4);

		removed = await list.splice(0);
		expect(await Array.fromAsync(removed)).toEqual([1, 6, 7, 8]);
		expect(await Array.fromAsync(list)).toEqual([]);
		expect(await list.count()).toBe(0);

		removed = await list.splice(0, 0, 1, 2, 3, 4, 5);
		expect(await Array.fromAsync(removed)).toEqual([]);
		expect(await Array.fromAsync(list)).toEqual([1, 2, 3, 4, 5]);
		expect(await list.count()).toBe(5);

		removed = await list.splice(await list.count(), 0, 6, 7);
		expect(await Array.fromAsync(removed)).toEqual([]);
		expect(await Array.fromAsync(list)).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(await list.count()).toBe(7);

		await list.splice(0);
		expect(() => list.splice(1)).toThrow(RangeError);
		expect(() => list.splice(-1)).toThrow(RangeError);
	});

	it("should slice items", async () => {
		const list: IList<number> = factory([1, 2, 3, 4, 5]);
		let sliced: MaybeAsyncIterableIterator<number>;

		sliced = await list.slice(1, 4);
		expect(await Array.fromAsync(sliced)).toEqual([2, 3, 4]);

		sliced = await list.slice(-4, -1);
		expect(await Array.fromAsync(sliced)).toEqual([2, 3, 4]);

		sliced = await list.slice(2);
		expect(await Array.fromAsync(sliced)).toEqual([3, 4, 5]);

		sliced = await list.slice(-3);
		expect(await Array.fromAsync(sliced)).toEqual([3, 4, 5]);

		sliced = await list.slice();
		expect(await Array.fromAsync(sliced)).toEqual([1, 2, 3, 4, 5]);

		sliced = await list.slice(3, 50);
		expect(await Array.fromAsync(sliced)).toEqual([4, 5]);
	});
});
