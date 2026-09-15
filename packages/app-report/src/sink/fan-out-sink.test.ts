import { expect, suite, test } from "vitest";

import { createFanOutSink } from "./fan-out-sink.js";
import { MemorySink } from "./memory-sink.js";

suite("createFanOutSink", () => {
	test("writes to every sink", async () => {
		const a = new MemorySink<number>();
		const b = new MemorySink<number>();
		const fanOut = createFanOutSink([a, b]);

		await fanOut.write({ kind: "data", timestamp: 0, scopeId: null, data: 1 });

		expect(a.events).toHaveLength(1);
		expect(b.events).toHaveLength(1);
	});

	test("enabled() is true if any sink is enabled", () => {
		const disabled = {
			write: () => {},
			flush: () => {},
			close: () => {},
			enabled: () => false,
		};
		const enabled = {
			write: () => {},
			flush: () => {},
			close: () => {},
			enabled: () => true,
		};

		expect(
			createFanOutSink([disabled, enabled]).enabled?.({ kind: "data" }),
		).toBe(true);
		expect(createFanOutSink([disabled]).enabled?.({ kind: "data" })).toBe(
			false,
		);
	});

	test("aggregates failures into an AggregateError by default", async () => {
		const failing = {
			write: () => {
				throw new Error("boom");
			},
			flush: () => {},
			close: () => {},
		};
		const fanOut = createFanOutSink([failing]);

		await expect(
			fanOut.write({ kind: "data", timestamp: 0, scopeId: null, data: 1 }),
		).rejects.toThrow(AggregateError);
	});

	test("routes failures to onSinkError instead of throwing when provided", async () => {
		const failing = {
			write: () => {
				throw new Error("boom");
			},
			flush: () => {},
			close: () => {},
		};
		const errors: unknown[] = [];
		const fanOut = createFanOutSink([failing], {
			onSinkError: (error) => errors.push(error),
		});

		await expect(
			fanOut.write({ kind: "data", timestamp: 0, scopeId: null, data: 1 }),
		).resolves.toBeUndefined();
		expect(errors).toHaveLength(1);
	});

	test("flush/close fan out to every sink", async () => {
		let flushed = 0;
		let closed = 0;
		const sink = {
			write: () => {},
			flush: () => {
				flushed++;
			},
			close: () => {
				closed++;
			},
		};
		const fanOut = createFanOutSink([sink, sink]);

		await fanOut.flush();
		await fanOut.close();

		expect(flushed).toBe(2);
		expect(closed).toBe(2);
	});
});
