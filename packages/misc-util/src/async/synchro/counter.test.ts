import { describe, expect, it } from "vitest";
import { Counter } from "./counter.js";

describe("Counter", () => {
	it("should initialize with default value 0", () => {
		const counter = new Counter();
		expect(counter.value).toBe(0);
	});

	it("should initialize with a custom value", () => {
		const counter = new Counter(5);
		expect(counter.value).toBe(5);
	});

	it("should increment the value and return the new value", () => {
		const counter = new Counter();
		const result = counter.increment();
		expect(result).toBe(1);
		expect(counter.value).toBe(1);
		expect(counter.increment()).toBe(2);
	});

	it("should decrement the value and return the new value", () => {
		const counter = new Counter(2);
		const result = counter.decrement();
		expect(result).toBe(1);
		expect(counter.value).toBe(1);
		expect(counter.decrement()).toBe(0);
	});

	it("should reset the value to 0", () => {
		const counter = new Counter(10);
		counter.reset();
		expect(counter.value).toBe(0);
	});

	it("should wait for a target value", async () => {
		const counter = new Counter();
		const waitPromise = counter.wait(2);
		counter.increment();
		counter.increment();
		await expect(waitPromise).resolves.toBeUndefined();
	});

	it("should respect the abort signal when waiting", async () => {
		const counter = new Counter();
		const abortController = new AbortController();
		const waitPromise = counter.wait(1, abortController.signal);
		abortController.abort();
		await expect(waitPromise).rejects.toThrow("This operation was aborted");
	});

	it("should return rejects when aborted even if the target value is already reached", async () => {
		const counter = new Counter(5);
		const abortController = new AbortController();
		abortController.abort();
		await expect(counter.wait(5, abortController.signal)).rejects.toThrow(
			"This operation was aborted",
		);
	});

	it("should resolve all concurrent waiters when target is reached", async () => {
		const counter = new Counter();
		let resolved1 = false;
		let resolved2 = false;
		let resolved3 = false;
		const p1 = counter.wait(2).then(() => {
			resolved1 = true;
		});
		const p2 = counter.wait(2).then(() => {
			resolved2 = true;
		});
		const p3 = counter.wait(2).then(() => {
			resolved3 = true;
		});
		counter.increment();
		expect(resolved1).toBe(false);
		expect(resolved2).toBe(false);
		expect(resolved3).toBe(false);
		counter.increment();
		await Promise.all([p1, p2, p3]);
		expect(resolved1).toBe(true);
		expect(resolved2).toBe(true);
		expect(resolved3).toBe(true);
	});

	it("should handle concurrent increment and decrement calls", async () => {
		const counter = new Counter();
		const increments = Array.from({ length: 10 }, () =>
			Promise.resolve().then(() => counter.increment()),
		);
		const decrements = Array.from({ length: 5 }, () =>
			Promise.resolve().then(() => counter.decrement()),
		);
		await Promise.all([...increments, ...decrements]);
		expect(counter.value).toBe(5);
	});

	it("should handle mixed increment, decrement, and wait calls", async () => {
		const counter = new Counter(1);
		let reached3 = false;
		let reached0 = false;
		const wait3 = counter.wait(3).then(() => {
			reached3 = true;
		});
		const wait0 = counter.wait(0).then(() => {
			reached0 = true;
		});
		counter.increment(); // 2
		expect(reached3).toBe(false);
		expect(reached0).toBe(false);
		counter.decrement(); // 1
		expect(reached3).toBe(false);
		expect(reached0).toBe(false);
		counter.decrement(); // 0
		await wait0;
		expect(reached0).toBe(true);
		expect(reached3).toBe(false);
		counter.increment(); // 1
		counter.increment(); // 2
		counter.increment(); // 3
		await wait3;
		expect(reached3).toBe(true);
		expect(counter.value).toBe(3);
	});
});
