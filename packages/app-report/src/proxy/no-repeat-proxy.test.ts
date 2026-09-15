import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { ReportEvent } from "../events.js";
import { MemorySink } from "../sink/memory-sink.js";
import { NoRepeatProxy } from "./no-repeat-proxy.js";

function dataEvent(data: number, timestamp = 0): ReportEvent<number> {
	return { kind: "data", timestamp, scopeId: null, data };
}

function output(chunk: string): ReportEvent<never> {
	return {
		kind: "output",
		timestamp: 0,
		scopeId: null,
		stream: "stdout",
		chunk,
	};
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

suite("NoRepeatProxy", () => {
	test("passes non-data events through untouched", async () => {
		const inner = new MemorySink<number>();
		const proxy = new NoRepeatProxy(inner);

		await proxy.write(output("a line") as ReportEvent<number>);

		expect(inner.events).toEqual([output("a line")]);
	});

	test("writes the first occurrence of a message immediately", async () => {
		const inner = new MemorySink<number>();
		const proxy = new NoRepeatProxy(inner);

		await proxy.write(dataEvent(1));

		expect(inner.events).toEqual([dataEvent(1)]);
	});

	test("suppresses consecutive identical messages", async () => {
		const inner = new MemorySink<number>();
		const proxy = new NoRepeatProxy(inner);

		await proxy.write(dataEvent(1));
		await proxy.write(dataEvent(1));
		await proxy.write(dataEvent(1));

		expect(inner.events).toEqual([dataEvent(1)]);
	});

	test("flushes a summary before writing a distinct message", async () => {
		const inner = new MemorySink<number>();
		const proxy = new NoRepeatProxy(inner);

		await proxy.write(dataEvent(1));
		await proxy.write(dataEvent(1));
		await proxy.write(dataEvent(1));
		await proxy.write(dataEvent(2));

		expect(inner.events).toEqual([
			dataEvent(1),
			{
				kind: "output",
				timestamp: expect.any(Number),
				scopeId: null,
				stream: "stdout",
				chunk: "last message repeated 2 time(s)\n",
			},
			dataEvent(2),
		]);
	});

	test("force-flushes and re-writes the message once maxCount is reached", async () => {
		const inner = new MemorySink<number>();
		const proxy = new NoRepeatProxy(inner, { maxCount: 3 });

		await proxy.write(dataEvent(1));
		await proxy.write(dataEvent(1));
		await proxy.write(dataEvent(1));
		await proxy.write(dataEvent(1));

		expect(inner.events.map((event) => event.kind)).toEqual([
			"data",
			"output",
			"data",
		]);
		expect(inner.events[1]).toMatchObject({
			chunk: "last message repeated 2 time(s)\n",
		});
	});

	test("force-flushes once maxDelayMs elapses between two incoming repeats", async () => {
		const inner = new MemorySink<number>();
		const proxy = new NoRepeatProxy(inner, { maxDelayMs: 500 });

		await proxy.write(dataEvent(1, 0));
		await proxy.write(dataEvent(1, 100));
		await proxy.write(dataEvent(1, 700));

		expect(inner.events.map((event) => event.kind)).toEqual([
			"data",
			"output",
			"data",
		]);
	});

	test("a background timer flushes the summary once repeats stop arriving", async () => {
		const inner = new MemorySink<number>();
		const proxy = new NoRepeatProxy(inner, { maxDelayMs: 500 });

		await proxy.write(dataEvent(1));
		await proxy.write(dataEvent(1));
		await vi.advanceTimersByTimeAsync(1000);

		expect(inner.events.map((event) => event.kind)).toEqual(["data", "output"]);
	});

	test("close() flushes a pending summary", async () => {
		const inner = new MemorySink<number>();
		const proxy = new NoRepeatProxy(inner);

		await proxy.write(dataEvent(1));
		await proxy.write(dataEvent(1));
		await proxy.close();

		expect(inner.events.map((event) => event.kind)).toEqual(["data", "output"]);
	});

	test("uses a custom isEqual and summary factory when given", async () => {
		const inner = new MemorySink<number>();
		const proxy = new NoRepeatProxy(inner, {
			isEqual: (a, b) => Math.abs(a - b) < 1,
			summary: (count) => ({ kind: "data", data: -count }),
		});

		await proxy.write(dataEvent(1));
		await proxy.write(dataEvent(1.2));
		await proxy.write(dataEvent(5));

		expect(inner.events).toEqual([
			dataEvent(1),
			{ kind: "data", timestamp: expect.any(Number), scopeId: null, data: -1 },
			dataEvent(5, 0),
		]);
	});

	test("enabled() delegates to the wrapped sink", () => {
		const inner = new MemorySink<number>();
		const disabled = {
			write: (event: ReportEvent<number>) => inner.write(event),
			flush: () => inner.flush(),
			close: () => inner.close(),
			enabled: () => false,
		};
		const proxy = new NoRepeatProxy(disabled);

		expect(proxy.enabled({ kind: "data" })).toBe(false);
	});
});
