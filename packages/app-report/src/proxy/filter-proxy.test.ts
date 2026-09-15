import { expect, suite, test } from "vitest";

import { ReportEvent } from "../events.js";
import { MemorySink } from "../sink/memory-sink.js";
import { byKind, createFilterProxy } from "./filter-proxy.js";

const dataEvent = (value: number): ReportEvent<number> => ({
	kind: "data",
	timestamp: value,
	scopeId: null,
	data: value,
});

const outputEvent: ReportEvent<never> = {
	kind: "output",
	timestamp: 0,
	scopeId: null,
	stream: "stdout",
	chunk: "hi",
};

suite("FilterProxy", () => {
	test("only forwards events matching the predicate", async () => {
		const inner = new MemorySink<number>();
		const proxy = createFilterProxy(inner, {
			predicate: (event) => event.kind === "data" && event.data > 1,
		});

		await proxy.write(dataEvent(1));
		await proxy.write(dataEvent(2));

		expect(inner.events).toEqual([dataEvent(2)]);
	});

	test("enabled() defers to the wrapped sink when no probe filter is set", () => {
		const inner = new MemorySink<number>();
		const proxy = createFilterProxy(inner, { predicate: () => true });

		expect(proxy.enabled?.({ kind: "data" })).toBe(true);
	});

	test("enabled() short-circuits when the probe filter rejects", () => {
		const inner = new MemorySink<number>();
		const proxy = createFilterProxy(inner, {
			predicate: () => true,
			probe: () => false,
		});

		expect(proxy.enabled?.({ kind: "data" })).toBe(false);
	});

	test("flush/close delegate to the wrapped sink", async () => {
		let flushed = false;
		let closed = false;
		const inner = {
			write: () => {},
			flush: () => {
				flushed = true;
			},
			close: () => {
				closed = true;
			},
		};
		const proxy = createFilterProxy(inner, { predicate: () => true });

		await proxy.flush();
		await proxy.close();

		expect(flushed).toBe(true);
		expect(closed).toBe(true);
	});
});

suite("byKind", () => {
	test("matches only the listed event kinds", () => {
		const predicate = byKind<number>("data");

		expect(predicate(dataEvent(1))).toBe(true);
		expect(predicate(outputEvent)).toBe(false);
	});
});
