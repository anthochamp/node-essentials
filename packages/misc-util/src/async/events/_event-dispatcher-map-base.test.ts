import { describe, expect, it, vi } from "vitest";
import { EventDispatcherMapBase } from "./_event-dispatcher-map-base.js";

describe("EventDispatcherMapBase", () => {
	interface Events extends Record<PropertyKey, unknown[]> {
		foo: [number, string];
		bar: [boolean];
	}

	class TestDispatcher extends EventDispatcherMapBase<Events> {
		public emit<K extends keyof Events>(event: K, ...args: Events[K]) {
			// Expose protected dispatch for testing
			this.dispatch(event, ...args);
		}
	}

	it("should subscribe and emit events for different keys", () => {
		const dispatcher = new TestDispatcher();
		const fooListener = vi.fn();
		const barListener = vi.fn();

		dispatcher.subscribe("foo", fooListener);
		dispatcher.subscribe("bar", barListener);

		dispatcher.emit("foo", 42, "hello");
		dispatcher.emit("bar", true);

		expect(fooListener).toHaveBeenCalledTimes(1);
		expect(fooListener).toHaveBeenCalledWith(42, "hello");
		expect(barListener).toHaveBeenCalledTimes(1);
		expect(barListener).toHaveBeenCalledWith(true);
	});

	it("should unsubscribe listeners", () => {
		const dispatcher = new TestDispatcher();
		const fooListener = vi.fn();
		dispatcher.subscribe("foo", fooListener);
		dispatcher.emit("foo", 1, "a");
		dispatcher.unsubscribe("foo", fooListener);
		dispatcher.emit("foo", 2, "b");
		expect(fooListener).toHaveBeenCalledTimes(1);
		expect(fooListener).toHaveBeenCalledWith(1, "a");
	});

	it("should support once option", () => {
		const dispatcher = new TestDispatcher();
		const fooListener = vi.fn();
		dispatcher.subscribe("foo", fooListener, { once: true });
		dispatcher.emit("foo", 1, "a");
		dispatcher.emit("foo", 2, "b");
		expect(fooListener).toHaveBeenCalledTimes(1);
		expect(fooListener).toHaveBeenCalledWith(1, "a");
	});

	it("should check isSubscribed", () => {
		const dispatcher = new TestDispatcher();
		const fooListener = vi.fn();
		dispatcher.subscribe("foo", fooListener);
		expect(dispatcher.isSubscribed("foo", fooListener)).toBe(true);
		dispatcher.unsubscribe("foo", fooListener);
		expect(dispatcher.isSubscribed("foo", fooListener)).toBe(false);
	});

	describe("wait", () => {
		it("resolves on first event emission", async () => {
			const dispatcher = new TestDispatcher();
			const promise = dispatcher.wait("bar");
			dispatcher.emit("bar", false);
			const result = await promise;
			expect(result).toEqual([false]);
		});

		it("resolves only when predicate matches", async () => {
			const dispatcher = new TestDispatcher();
			const promise = dispatcher.wait("foo", {
				predicate: (num) => num === 1,
			});
			dispatcher.emit("foo", 0, "no");
			dispatcher.emit("foo", 1, "yes");
			const result = await promise;
			expect(result).toEqual([1, "yes"]);
		});
	});
});
