import { describe, expect, it, vi } from "vitest";

import { EventDispatcherBase } from "./event-dispatcher-base.js";

describe("EventDispatcherBase", () => {
	it("should allow subscribing and publishing values", () => {
		const sub = new EventDispatcherBase<[number]>();
		const handler = vi.fn();
		sub.subscribe(handler);
		// @ts-expect-error accessing protected method for test
		sub.dispatch([42]);
		expect(handler).toHaveBeenCalledWith(42);
	});

	it("should allow unsubscribing", () => {
		const sub = new EventDispatcherBase<[number]>();
		const handler = vi.fn();
		sub.subscribe(handler);
		sub.unsubscribe(handler);
		// @ts-expect-error accessing protected method for test
		sub.dispatch([99]);
		expect(handler).not.toHaveBeenCalled();
	});

	it("should support multiple subscribers", () => {
		const sub = new EventDispatcherBase<[string]>();
		const h1 = vi.fn();
		const h2 = vi.fn();
		sub.subscribe(h1);
		sub.subscribe(h2);
		// @ts-expect-error accessing protected method for test
		sub.dispatch(["hello"]);
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
		sub.dispatch(["x"]);

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
		sub.dispatch(["y"]);

		expect(calls).toEqual(["first:y", "second:y"]);
	});

	it("should order every subscriber by priority, not just the first", () => {
		const sub = new EventDispatcherBase<[string]>();
		const calls: number[] = [];
		const listeners = [3, 1, 4, 1, 5, 9, 2, 6].map((priority, index) => ({
			priority,
			index,
			listener: () => {
				calls.push(index);
			},
		}));

		for (const { listener, priority } of listeners) {
			sub.subscribe(listener, { priority });
		}

		// @ts-expect-error accessing protected method for test
		sub.dispatch(["z"]);

		const expected = [...listeners]
			.sort(
				(left, right) =>
					right.priority - left.priority || left.index - right.index,
			)
			.map(({ index }) => index);
		expect(calls).toEqual(expected);
	});

	it("should refuse to subscribe the same listener twice", () => {
		const sub = new EventDispatcherBase<[number]>();
		const handler = vi.fn();

		expect(sub.subscribe(handler)).toBeTypeOf("function");
		expect(sub.subscribe(handler)).toBeNull();

		// @ts-expect-error accessing protected method for test
		sub.dispatch([1]);

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("should unsubscribe through the returned callback", () => {
		const sub = new EventDispatcherBase<[number]>();
		const handler = vi.fn();

		const unsubscribe = sub.subscribe(handler);
		unsubscribe?.();
		// @ts-expect-error accessing protected method for test
		sub.dispatch([1]);

		expect(handler).not.toHaveBeenCalled();
		expect(sub.isSubscribed(handler)).toBe(false);
	});

	it("should deliver to every listener when a once listener removes itself mid-dispatch", () => {
		const sub = new EventDispatcherBase<[number]>();
		const before = vi.fn();
		const onceHandler = vi.fn();
		const after = vi.fn();

		sub.subscribe(before);
		sub.subscribe(onceHandler, { once: true });
		sub.subscribe(after);

		// @ts-expect-error accessing protected method for test
		sub.dispatch([1]);
		// @ts-expect-error accessing protected method for test
		sub.dispatch([2]);

		expect(before).toHaveBeenCalledTimes(2);
		expect(onceHandler).toHaveBeenCalledTimes(1);
		expect(onceHandler).toHaveBeenCalledWith(1);
		expect(after).toHaveBeenCalledTimes(2);
		expect(after).toHaveBeenLastCalledWith(2);
	});

	it("should not skip a listener when its predecessor unsubscribes it mid-dispatch", () => {
		const sub = new EventDispatcherBase<[number]>();
		const third = vi.fn();
		const second = vi.fn();
		const first = () => {
			sub.unsubscribe(second);
		};

		sub.subscribe(first, { priority: 3 });
		sub.subscribe(second, { priority: 2 });
		sub.subscribe(third, { priority: 1 });

		// @ts-expect-error accessing protected method for test
		sub.dispatch([1]);

		expect(second).not.toHaveBeenCalled();
		expect(third).toHaveBeenCalledTimes(1);
		expect(third).toHaveBeenCalledWith(1);
	});

	it("should keep the remaining listeners after a mid-dispatch removal", () => {
		const sub = new EventDispatcherBase<[number]>();
		const removed = vi.fn();
		const kept = vi.fn();
		const remover = () => {
			sub.unsubscribe(removed);
		};

		sub.subscribe(remover, { priority: 2 });
		sub.subscribe(removed, { priority: 1 });
		sub.subscribe(kept, { priority: 0 });

		// @ts-expect-error accessing protected method for test
		sub.dispatch([1]);
		// @ts-expect-error accessing protected method for test
		sub.dispatch([2]);

		expect(removed).not.toHaveBeenCalled();
		expect(kept).toHaveBeenCalledTimes(2);
		expect(sub.isSubscribed(removed)).toBe(false);
		expect(sub.isSubscribed(kept)).toBe(true);
	});
});
