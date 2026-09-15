import { expect, suite, test } from "vitest";

import type { ReportEvent, ReportScopeStatus } from "../events.js";
import type { Formatter } from "../formatter.js";
import { FailureCollectorSink } from "./failure-collector-sink.js";
import { MemorySink } from "./memory-sink.js";

const formatter: Formatter<never> = (event, context) => {
	switch (event.kind) {
		case "scope-end": {
			const title = context.scopes.get(event.scopeId)?.title ?? event.scopeId;
			return `FAILED: ${title}`;
		}

		case "output":
			return event.chunk;

		default:
			return null;
	}
};

function scopeStart(id: string): ReportEvent<never> {
	return {
		kind: "scope-start",
		timestamp: 0,
		scopeId: id,
		parentId: null,
		title: id,
		key: id,
	};
}

function scopeEnd(id: string, status: ReportScopeStatus): ReportEvent<never> {
	return {
		kind: "scope-end",
		timestamp: 1,
		scopeId: id,
		status,
		durationMs: 1,
	};
}

function output(scopeId: string, chunk: string): ReportEvent<never> {
	return { kind: "output", timestamp: 0, scopeId, stream: "stdout", chunk };
}

function outputChunks(events: readonly ReportEvent<never>[]): string[] {
	return events
		.filter((event) => event.kind === "output")
		.map((event) => event.chunk);
}

suite("FailureCollectorSink", () => {
	test("forwards every event through unchanged", async () => {
		const inner = new MemorySink<never>();
		const sink = new FailureCollectorSink(inner, { formatter });

		await sink.write(scopeStart("a"));
		await sink.write(scopeEnd("a", "ok"));

		expect(inner.events.map((event) => event.kind)).toEqual([
			"scope-start",
			"scope-end",
		]);
	});

	test("writes nothing extra at close() when nothing failed", async () => {
		const inner = new MemorySink<never>();
		const sink = new FailureCollectorSink(inner, { formatter });

		await sink.write(scopeStart("a"));
		await sink.write(scopeEnd("a", "ok"));
		await sink.close();

		expect(inner.events).toHaveLength(2);
	});

	test("re-prints a failed scope's header and buffered output at close()", async () => {
		const inner = new MemorySink<never>();
		const sink = new FailureCollectorSink(inner, { formatter });

		await sink.write(scopeStart("a"));
		await sink.write(output("a", "line 1"));
		await sink.write(output("a", "line 2"));
		await sink.write(scopeEnd("a", "failed"));
		await sink.close();

		expect(outputChunks(inner.events.slice(4))).toEqual([
			"FAILED: a\n",
			"line 1\n",
			"line 2\n",
		]);
	});

	test("does not replay buffered output when includeOutput is false", async () => {
		const inner = new MemorySink<never>();
		const sink = new FailureCollectorSink(inner, {
			formatter,
			includeOutput: false,
		});

		await sink.write(scopeStart("a"));
		await sink.write(output("a", "line 1"));
		await sink.write(scopeEnd("a", "failed"));
		await sink.close();

		expect(outputChunks(inner.events.slice(3))).toEqual(["FAILED: a\n"]);
	});

	test("evicts the oldest buffered event once the window is full", async () => {
		const inner = new MemorySink<never>();
		const sink = new FailureCollectorSink(inner, { formatter, windowSize: 2 });

		await sink.write(scopeStart("a"));
		await sink.write(output("a", "line 1"));
		await sink.write(output("a", "line 2"));
		await sink.write(output("a", "line 3"));
		await sink.write(scopeEnd("a", "failed"));
		await sink.close();

		expect(outputChunks(inner.events.slice(5))).toEqual([
			"FAILED: a\n",
			"line 2\n",
			"line 3\n",
		]);
	});

	test("caps the number of retained failures at maxFailures", async () => {
		const inner = new MemorySink<never>();
		const sink = new FailureCollectorSink(inner, { formatter, maxFailures: 1 });

		await sink.write(scopeStart("a"));
		await sink.write(scopeEnd("a", "failed"));
		await sink.write(scopeStart("b"));
		await sink.write(scopeEnd("b", "failed"));
		await sink.close();

		const summary = inner.events.slice(4);
		expect(outputChunks(summary)).toEqual(["FAILED: a\n"]);
	});

	test("does not treat a cancelled scope as a failure", async () => {
		const inner = new MemorySink<never>();
		const sink = new FailureCollectorSink(inner, { formatter });

		await sink.write(scopeStart("a"));
		await sink.write(scopeEnd("a", "cancelled"));
		await sink.close();

		expect(inner.events).toHaveLength(2);
	});

	test("close() closes the wrapped sink", async () => {
		let closed = false;
		const inner = {
			write: () => {},
			flush: () => {},
			close: () => {
				closed = true;
			},
		};
		const sink = new FailureCollectorSink(inner, { formatter });

		await sink.close();

		expect(closed).toBe(true);
	});

	test("enabled() delegates to the wrapped sink", () => {
		const inner = {
			write: () => {},
			flush: () => {},
			close: () => {},
			enabled: () => false,
		};
		const sink = new FailureCollectorSink(inner, { formatter });

		expect(sink.enabled({ kind: "data" })).toBe(false);
	});

	test("flush() delegates to the wrapped sink", async () => {
		let flushed = false;
		const inner = {
			write: () => {},
			flush: () => {
				flushed = true;
			},
			close: () => {},
		};
		const sink = new FailureCollectorSink(inner, { formatter });

		await sink.flush();

		expect(flushed).toBe(true);
	});
});
