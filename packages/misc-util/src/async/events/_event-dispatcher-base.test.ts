import { describe, expect, it, vi } from "vitest";
import { EventDispatcherBase } from "./_event-dispatcher-base.js";

describe("EventDispatcherBase", () => {
	it("should allow subscribing and publishing values", () => {
		const sub = new EventDispatcherBase<[number]>();
		const handler = vi.fn();
		sub.subscribe(handler);
		// @ts-expect-error accessing protected method for test
		sub.dispatch(42);
		expect(handler).toHaveBeenCalledWith(42);
	});

	it("should allow unsubscribing", () => {
		const sub = new EventDispatcherBase<[number]>();
		const handler = vi.fn();
		sub.subscribe(handler);
		sub.unsubscribe(handler);
		// @ts-expect-error accessing protected method for test
		sub.dispatch(99);
		expect(handler).not.toHaveBeenCalled();
	});

	it("should support multiple subscribers", () => {
		const sub = new EventDispatcherBase<[string]>();
		const h1 = vi.fn();
		const h2 = vi.fn();
		sub.subscribe(h1);
		sub.subscribe(h2);
		// @ts-expect-error accessing protected method for test
		sub.dispatch("hello");
		expect(h1).toHaveBeenCalledWith("hello");
		expect(h2).toHaveBeenCalledWith("hello");
	});

	it("should invoke higher priority subscribers first", () => {
		const sub = new EventDispatcherBase<[string]>();
		const calls: string[] = [];
		const low = (value: string) => {
			calls.push(`low:${value}`);
		};
		const high = (value: string) => {
			calls.push(`high:${value}`);
		};

		sub.subscribe(low, { priority: 0 });
		sub.subscribe(high, { priority: 10 });

		// @ts-expect-error accessing protected method for test
		sub.dispatch("x");

		expect(calls).toEqual(["high:x", "low:x"]);
	});

	it("should preserve insertion order for equal priority subscribers", () => {
		const sub = new EventDispatcherBase<[string]>();
		const calls: string[] = [];
		const first = (value: string) => {
			calls.push(`first:${value}`);
		};
		const second = (value: string) => {
			calls.push(`second:${value}`);
		};

		sub.subscribe(first, { priority: 5 });
		sub.subscribe(second, { priority: 5 });

		// @ts-expect-error accessing protected method for test
		sub.dispatch("y");

		expect(calls).toEqual(["first:y", "second:y"]);
	});
});
