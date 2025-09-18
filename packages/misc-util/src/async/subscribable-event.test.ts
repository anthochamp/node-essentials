import { expect, suite, test, vi } from "vitest";
import { SubscribableEvent } from "./subscribable-event.js";

suite("SubscribableEvent", () => {
	test("should register and trigger events", () => {
		const event = new SubscribableEvent<[number]>();

		const listener = vi.fn();
		event.subscribe(listener);

		event.trigger(42);

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenNthCalledWith(1, 42);

		event.trigger(100);

		expect(listener).toHaveBeenCalledTimes(2);
		expect(listener).toHaveBeenNthCalledWith(2, 100);
	});

	test("should not register the same listener multiple times", () => {
		const event = new SubscribableEvent<[number]>();

		const listener = vi.fn();

		event.subscribe(listener);
		event.subscribe(listener); // Duplicate subscription
		event.trigger(42);

		expect(listener).toHaveBeenCalledOnce(); // Should only be called once
	});

	test("should unregister listeners", () => {
		const event = new SubscribableEvent<[number]>();

		const listener = vi.fn();
		event.subscribe(listener);

		event.trigger(42);
		expect(listener).toHaveBeenCalledOnce();

		event.unsubscribe(listener);

		event.trigger(100);
		expect(listener).toHaveBeenCalledOnce(); // Should not be called again
	});

	test("should register one-time listeners", () => {
		const event = new SubscribableEvent<[number]>();

		const listener = vi.fn();
		event.subscribe(listener, { once: true });

		event.trigger(42);
		expect(listener).toHaveBeenCalledOnce();

		event.trigger(100);
		expect(listener).toHaveBeenCalledOnce(); // Should not be called again
	});

	test("should not register the same one-time listener multiple times", () => {
		const event = new SubscribableEvent<[number]>();

		const listener = vi.fn();

		event.subscribe(listener, { once: true });
		event.subscribe(listener, { once: true }); // Duplicate subscription
		event.subscribe(listener); // Duplicate subscription
		event.trigger(42);

		expect(listener).toHaveBeenCalledOnce(); // Should only be called once
	});

	test("should unregister one-time listeners", () => {
		const event = new SubscribableEvent<[number]>();

		const listener = vi.fn();
		event.subscribe(listener, { once: true });

		event.trigger(42);
		expect(listener).toHaveBeenCalledOnce();

		event.subscribe(listener, { once: true });
		event.unsubscribe(listener);

		event.trigger(100);
		expect(listener).toHaveBeenCalledOnce(); // Should not be called again
	});

	test("should check if a listener is registered", () => {
		const event = new SubscribableEvent<[number]>();

		const listener = (_value: number) => {};

		expect(event.isSubscribed(listener)).toBe(false);

		event.subscribe(listener);
		expect(event.isSubscribed(listener)).toBe(true);

		event.unsubscribe(listener);
		expect(event.isSubscribed(listener)).toBe(false);

		event.subscribe(listener, { once: true });
		expect(event.isSubscribed(listener)).toBe(true);

		event.unsubscribe(listener);
		expect(event.isSubscribed(listener)).toBe(false);
	});

	test("should wait for the next event emission", async () => {
		const event = new SubscribableEvent<[number]>();

		const waitPromise = event.wait();

		event.trigger(42);

		const result = await waitPromise;

		expect(result).toEqual([42]);
	});

	test("should timeout if the event is not emitted in time", async () => {
		const event = new SubscribableEvent<[number]>();

		const waitPromise = event.wait(AbortSignal.timeout(0));

		await expect(waitPromise).rejects.toThrow();
	});
});
