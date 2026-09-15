import { Queue } from "@ac-kit/data";
import { expect, suite, test } from "vitest";

import { QueueReceiver } from "./queue-receiver.js";

suite("QueueReceiver", () => {
	test("should resolve immediately when an item is already queued", async () => {
		const queue = new Queue<number>([1]);
		const receiver = new QueueReceiver(queue);

		await expect(receiver.receive()).resolves.toBe(1);
	});

	test("should wait until notified, then dequeue the new item", async () => {
		const queue = new Queue<number>();
		const receiver = new QueueReceiver(queue);

		let received: number | undefined;
		const pending = receiver.receive().then((value) => {
			received = value;
		});

		await Promise.resolve();
		expect(received).toBeUndefined();

		queue.enqueue(1);
		receiver.notify();
		await pending;

		expect(received).toBe(1);
	});

	test("should not lose a notify sent before receive() starts waiting", async () => {
		const queue = new Queue<number>();
		const receiver = new QueueReceiver(queue);

		queue.enqueue(1);
		receiver.notify();

		await expect(receiver.receive()).resolves.toBe(1);
	});

	test("should reject when its signal aborts while waiting", async () => {
		const queue = new Queue<number>();
		const receiver = new QueueReceiver(queue);
		const controller = new AbortController();

		const pending = receiver.receive(controller.signal);
		controller.abort();

		await expect(pending).rejects.toBeDefined();
	});

	test("should serve items in FIFO order across repeated receives", async () => {
		const queue = new Queue<number>([1, 2, 3]);
		const receiver = new QueueReceiver(queue);

		expect(await receiver.receive()).toBe(1);
		expect(await receiver.receive()).toBe(2);
		expect(await receiver.receive()).toBe(3);
	});
});
