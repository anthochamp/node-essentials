import { CollectionCapacityExceededError } from "@ac-kit/data";
import { expect, suite, test } from "vitest";

import type { ReportEvent } from "../events.js";
import { AsyncQueueSink } from "./async-queue-sink.js";
import { MemorySink } from "./memory-sink.js";

function dataEvent(data: number): ReportEvent<number> {
	return { kind: "data", timestamp: 0, scopeId: null, data };
}

function eventData_(events: readonly ReportEvent<number>[]): number[] {
	return events.map((event) => (event.kind === "data" ? event.data : -1));
}

suite("AsyncQueueSink", () => {
	test("should drain every write to the wrapped sink", async () => {
		const inner = new MemorySink<number>();
		const sink = new AsyncQueueSink(inner);

		await sink.write(dataEvent(1));
		await sink.write(dataEvent(2));
		await sink.flush();

		expect(eventData_(inner.events)).toEqual([1, 2]);
	});

	test("should evict the oldest event under drop-oldest overflow", async () => {
		const inner = new MemorySink<number>();
		const dropped: ReportEvent<number>[] = [];
		const sink = new AsyncQueueSink(inner, {
			maxQueue: 2,
			overflow: "drop-oldest",
			onOverflow: (events) => dropped.push(...events),
		});

		void sink.write(dataEvent(1));
		void sink.write(dataEvent(2));
		void sink.write(dataEvent(3));

		expect(eventData_(dropped)).toEqual([1]);

		await sink.flush();
		expect(eventData_(inner.events)).toEqual([2, 3]);
	});

	test("should skip the incoming event under drop overflow", async () => {
		const inner = new MemorySink<number>();
		const dropped: ReportEvent<number>[] = [];
		const sink = new AsyncQueueSink(inner, {
			maxQueue: 2,
			overflow: "drop",
			onOverflow: (events) => dropped.push(...events),
		});

		void sink.write(dataEvent(1));
		void sink.write(dataEvent(2));
		void sink.write(dataEvent(3));

		expect(eventData_(dropped)).toEqual([3]);

		await sink.flush();
		expect(eventData_(inner.events)).toEqual([1, 2]);
	});

	test("should throw once full under error overflow", async () => {
		const inner = new MemorySink<number>();
		const sink = new AsyncQueueSink(inner, { maxQueue: 1, overflow: "error" });

		// Not awaited: the drain loop only wakes up once this write's own
		// `notify()` runs, which happens after this call suspends — so the
		// queue is still genuinely full when the second write is attempted.
		void sink.write(dataEvent(1));

		await expect(sink.write(dataEvent(2))).rejects.toThrow(
			CollectionCapacityExceededError,
		);
	});

	test("should block until capacity frees up under block overflow", async () => {
		const inner = new MemorySink<number>();
		const sink = new AsyncQueueSink(inner, { maxQueue: 1, overflow: "block" });

		await sink.write(dataEvent(1));

		await sink.write(dataEvent(2));
		await sink.flush();

		expect(eventData_(inner.events)).toEqual([1, 2]);
	});

	test("flush should resolve immediately when nothing is pending", async () => {
		const inner = new MemorySink<number>();
		const sink = new AsyncQueueSink(inner);

		await expect(sink.flush()).resolves.toBeUndefined();
	});

	test("close should drain the backlog then close the wrapped sink", async () => {
		const inner = new MemorySink<number>();
		let closed = false;
		const wrapped = {
			write: (event: ReportEvent<number>) => inner.write(event),
			flush: () => inner.flush(),
			close: () => {
				closed = true;
			},
		};
		const sink = new AsyncQueueSink(wrapped);

		void sink.write(dataEvent(1));
		await sink.close();

		expect(eventData_(inner.events)).toEqual([1]);
		expect(closed).toBe(true);
	});

	test("should reject further writes once closing", async () => {
		const inner = new MemorySink<number>();
		const sink = new AsyncQueueSink(inner);

		const closePromise = sink.close();
		await expect(sink.write(dataEvent(1))).rejects.toThrow();
		await closePromise;
	});

	test("enabled() should delegate to the wrapped sink", () => {
		const inner = new MemorySink<number>();
		const disabled = {
			write: (event: ReportEvent<number>) => inner.write(event),
			flush: () => inner.flush(),
			close: () => inner.close(),
			enabled: () => false,
		};
		const sink = new AsyncQueueSink(disabled);

		expect(sink.enabled({ kind: "data" })).toBe(false);
	});

	test("onSinkError surfaces a write failure without stopping the drain loop", async () => {
		const inner = new MemorySink<number>();
		const errors: unknown[] = [];
		const failingOnce = {
			write: (event: ReportEvent<number>) => {
				if (event.kind === "data" && event.data === 1) {
					throw new Error("boom");
				}
				return inner.write(event);
			},
			flush: () => inner.flush(),
			close: () => inner.close(),
		};
		const sink = new AsyncQueueSink(failingOnce, {
			onSinkError: (error) => errors.push(error),
		});

		await sink.write(dataEvent(1));
		await sink.write(dataEvent(2));
		await sink.flush();

		expect(errors).toHaveLength(1);
		expect((errors[0] as Error).message).toBe("boom");
		expect(eventData_(inner.events)).toEqual([2]);
	});

	test("close() rejects with a write failure when onSinkError is not given", async () => {
		const failing = {
			write: () => {
				throw new Error("boom");
			},
			flush: () => {},
			close: () => {},
		};
		const sink = new AsyncQueueSink(failing);

		void sink.write(dataEvent(1));

		await expect(sink.close()).rejects.toThrow("boom");
	});
});
