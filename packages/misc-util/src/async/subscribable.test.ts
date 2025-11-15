import { describe, expect, it, vi } from "vitest";
import { Subscribable } from "./subscribable.js";

describe("Subscribable", () => {
	it("should allow subscribing and publishing values", () => {
		const sub = new Subscribable<[number]>();
		const handler = vi.fn();
		sub.subscribe(handler);
		// @ts-expect-error accessing protected method for test
		sub.publish(42);
		expect(handler).toHaveBeenCalledWith(42);
	});

	it("should allow unsubscribing", () => {
		const sub = new Subscribable<[number]>();
		const handler = vi.fn();
		sub.subscribe(handler);
		sub.unsubscribe(handler);
		// @ts-expect-error accessing protected method for test
		sub.publish(99);
		expect(handler).not.toHaveBeenCalled();
	});

	it("should support multiple subscribers", () => {
		const sub = new Subscribable<[string]>();
		const h1 = vi.fn();
		const h2 = vi.fn();
		sub.subscribe(h1);
		sub.subscribe(h2);
		// @ts-expect-error accessing protected method for test
		sub.publish("hello");
		expect(h1).toHaveBeenCalledWith("hello");
		expect(h2).toHaveBeenCalledWith("hello");
	});
});
