import { describe, expect, it } from "vitest";
import { Event } from "../event.js";
import { eventDispatcherToAsyncIterator } from "./event-dispatcher-to-async-iterator.js";

describe("subscribableToAsyncIterator", () => {
	it("yields published events in order", async () => {
		const sub = new Event<number>();
		const iterable = eventDispatcherToAsyncIterator(sub);
		const iterator = iterable[Symbol.asyncIterator]();

		sub.emit(1);
		sub.emit(2);

		const first = await iterator.next();
		const second = await iterator.next();

		expect(first.done).toBe(false);
		expect(first.value).toEqual([1]);
		expect(second.done).toBe(false);
		expect(second.value).toEqual([2]);
	});
});
