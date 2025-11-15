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

	it("should return immediately if the target value is already reached", async () => {
		const counter = new Counter(5);
		const abortController = new AbortController();
		abortController.abort();
		await expect(
			counter.wait(5, abortController.signal),
		).resolves.toBeUndefined();
	});
});
