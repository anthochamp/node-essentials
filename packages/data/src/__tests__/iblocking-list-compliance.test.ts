import type { Callable } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { BlockingArrayList } from "../list/blocking-array-list.js";
import { BlockingCircularArrayList } from "../list/blocking-circular-array-list.js";
import { BlockingDoublyLinkedList } from "../list/blocking-doubly-linked-list.js";
import { BlockingLinkedList } from "../list/blocking-linked-list.js";
import { IWaitableList } from "../list/iwaitable-list.js";

/**
 * `IWaitableList` compliance tests for the four `Blocking*List` wrappers.
 *
 * These tests ensure `waitSet`/`waitSplice` resolve immediately under capacity,
 * and actually block (then resolve once capacity frees up) at capacity.
 */

suite.each<{
	description: string;
	factory: Callable<[capacity: number], IWaitableList<number>>;
}>([
	{
		description: "BlockingDoublyLinkedList",
		factory: (capacity) =>
			new BlockingDoublyLinkedList(undefined, { capacity }),
	},
	{
		description: "BlockingLinkedList",
		factory: (capacity) => new BlockingLinkedList(undefined, { capacity }),
	},
	{
		description: "BlockingArrayList",
		factory: (capacity) => new BlockingArrayList(undefined, { capacity }),
	},
	{
		description: "BlockingCircularArrayList",
		factory: (capacity) =>
			new BlockingCircularArrayList(undefined, { capacity }),
	},
])("$description IWaitableList compliance", ({ factory }) => {
	test("should resolve waitSet immediately when under capacity", async () => {
		const list = factory(2);
		list.set(0, 1);

		await list.waitSet(1, 2);

		expect(Array.from(list)).toEqual([1, 2]);
	});

	test("should block waitSet until capacity frees up, then append", async () => {
		const list = factory(1);
		list.set(0, 1);

		let resolved = false;
		const pending = list.waitSet(1, 2).then(() => {
			resolved = true;
		});

		await Promise.resolve();
		expect(resolved).toBe(false);

		list.splice(0, 1);
		await pending;

		expect(resolved).toBe(true);
		expect(Array.from(list)).toEqual([2]);
	});

	test("should reject a blocked waitSet when its signal aborts", async () => {
		const list = factory(1);
		list.set(0, 1);

		const controller = new AbortController();
		const pending = list.waitSet(1, 2, controller.signal);

		controller.abort();

		await expect(pending).rejects.toBeDefined();
	});

	test("should resolve waitSplice immediately when under capacity", async () => {
		const list = factory(3);
		list.set(0, 1);

		const removed = await list.waitSpliceAll(1, 0, [2, 3]);

		expect(Array.from(removed)).toEqual([]);
		expect(Array.from(list)).toEqual([1, 2, 3]);
	});

	test("should block waitSplice until capacity frees up, then insert", async () => {
		const list = factory(1);
		list.set(0, 1);

		let resolved = false;
		const pending = list.waitSplice(1, 0, 2).then(() => {
			resolved = true;
		});

		await Promise.resolve();
		expect(resolved).toBe(false);

		list.splice(0, 1);
		await pending;

		expect(resolved).toBe(true);
		expect(Array.from(list)).toEqual([2]);
	});

	test("should reject a blocked waitSplice when its signal aborts", async () => {
		const list = factory(1);
		list.set(0, 1);

		const controller = new AbortController();
		const pending = list.waitSplice(1, 0, 2, controller.signal);

		controller.abort();

		await expect(pending).rejects.toBeDefined();
	});
});
