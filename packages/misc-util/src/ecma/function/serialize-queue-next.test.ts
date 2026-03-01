import { expect, suite, test } from "vitest";
import { sleep } from "../timers/sleep.js";
import { serializeQueueNext } from "./serialize-queue-next.js";

suite("serializeQueueNext", () => {
	test("should execute the function immediately if not already running", async () => {
		let callCount = 0;
		const func = async () => {
			callCount++;
			return callCount;
		};
		const funcSqn = serializeQueueNext(func);

		const result = await funcSqn();
		expect(result).toBe(1);
		expect(callCount).toBe(1);
	});

	test("should queue subsequent calls while the function is running", async () => {
		let callCount = 0;
		const func = async () => {
			callCount++;
			await sleep(10);
			return callCount;
		};
		const funcSqn = serializeQueueNext(func);

		const promise1 = funcSqn();
		const promise2 = funcSqn();
		const promise3 = funcSqn();

		const results = await Promise.all([promise1, promise2, promise3]);
		expect(results).toEqual([1, 2, 2]);
		expect(callCount).toBe(2);
	});

	test("should handle promise rejection properly", async () => {
		const error = new Error("Test error");
		let callCount = 0;
		const func = async () => {
			callCount++;
			if (callCount === 1) {
				throw error;
			}
			return callCount;
		};
		const funcSqn = serializeQueueNext(func);

		await expect(() => funcSqn()).rejects.toThrow(error);

		const result = await funcSqn();
		expect(result).toBe(2);
		expect(callCount).toBe(2);
	});

	test("should handle synchronous exceptions properly", async () => {
		const error = new Error("Test error");
		let callCount = 0;
		const func = async () => {
			callCount++;
			if (callCount === 1) {
				throw error;
			}
			return callCount;
		};
		const funcSqn = serializeQueueNext(func);

		await expect(() => funcSqn()).rejects.toThrow(error);

		const result = await funcSqn();
		expect(result).toBe(2);
		expect(callCount).toBe(2);
	});

	test("should return the result of the last queued call", async () => {
		let callCount = 0;
		const func = async () => {
			callCount++;
			await sleep(10);
			return callCount;
		};
		const funcSqn = serializeQueueNext(func);

		const promise1 = funcSqn();
		const promise2 = funcSqn();
		const promise3 = funcSqn();

		const results = await Promise.all([promise1, promise2, promise3]);
		expect(results).toEqual([1, 2, 2]);
		expect(callCount).toBe(2);
	});
});
