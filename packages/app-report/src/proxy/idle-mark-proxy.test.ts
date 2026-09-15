import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { ReportEvent } from "../events.js";
import { MemorySink } from "../sink/memory-sink.js";
import { IdleMarkProxy } from "./idle-mark-proxy.js";

function dataEvent(data: number): ReportEvent<number> {
	return { kind: "data", timestamp: 0, scopeId: null, data };
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

suite("IdleMarkProxy", () => {
	test("passes writes through untouched", async () => {
		const inner = new MemorySink<number>();
		const proxy = new IdleMarkProxy(inner);

		await proxy.write(dataEvent(1));

		expect(inner.events).toEqual([dataEvent(1)]);
	});

	test("emits a mark after idleDelayMs with no writes", async () => {
		const inner = new MemorySink<number>();
		const proxy = new IdleMarkProxy(inner, { idleDelayMs: 500 });

		await proxy.write(dataEvent(1));
		await vi.advanceTimersByTimeAsync(1000);

		expect(inner.events).toEqual([
			dataEvent(1),
			{
				kind: "output",
				timestamp: expect.any(Number),
				scopeId: null,
				stream: "stdout",
				chunk: "MARK\n",
			},
		]);
	});

	test("a write resets the idle timer", async () => {
		const inner = new MemorySink<number>();
		const proxy = new IdleMarkProxy(inner, { idleDelayMs: 900 });

		await proxy.write(dataEvent(1));
		await vi.advanceTimersByTimeAsync(500);
		await proxy.write(dataEvent(2));
		await vi.advanceTimersByTimeAsync(500);

		expect(inner.events.map((event) => event.kind)).toEqual(["data", "data"]);
	});

	test("uses a custom mark factory when given", async () => {
		const inner = new MemorySink<number>();
		const proxy = new IdleMarkProxy(inner, {
			idleDelayMs: 500,
			mark: () => ({ kind: "data", data: -1 }),
		});

		await proxy.write(dataEvent(1));
		await vi.advanceTimersByTimeAsync(1000);

		expect(inner.events.at(-1)).toMatchObject({ kind: "data", data: -1 });
	});

	test("close() stops the timer", async () => {
		const inner = new MemorySink<number>();
		const proxy = new IdleMarkProxy(inner, { idleDelayMs: 500 });

		await proxy.write(dataEvent(1));
		await proxy.close();
		await vi.advanceTimersByTimeAsync(2000);

		expect(inner.events).toEqual([dataEvent(1)]);
	});

	test("enabled() delegates to the wrapped sink", () => {
		const inner = new MemorySink<number>();
		const disabled = {
			write: (event: ReportEvent<number>) => inner.write(event),
			flush: () => inner.flush(),
			close: () => inner.close(),
			enabled: () => false,
		};
		const proxy = new IdleMarkProxy(disabled);

		expect(proxy.enabled({ kind: "data" })).toBe(false);
	});
});
