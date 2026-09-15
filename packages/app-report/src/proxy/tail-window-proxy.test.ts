import { expect, suite, test } from "vitest";

import { ReportEvent, ReportScopeStatus } from "../events.js";
import { MemorySink } from "../sink/memory-sink.js";
import { TailWindowProxy } from "./tail-window-proxy.js";

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

suite("TailWindowProxy", () => {
	test("discards buffered output when the scope ends ok", async () => {
		const inner = new MemorySink<never>();
		const proxy = new TailWindowProxy(inner);

		await proxy.write(scopeStart("a"));
		await proxy.write(output("a", "line 1"));
		await proxy.write(output("a", "line 2"));
		await proxy.write(scopeEnd("a", "ok"));

		expect(inner.events.map((event) => event.kind)).toEqual([
			"scope-start",
			"scope-end",
		]);
	});

	test("discards buffered output when the scope is skipped", async () => {
		const inner = new MemorySink<never>();
		const proxy = new TailWindowProxy(inner);

		await proxy.write(scopeStart("a"));
		await proxy.write(output("a", "line 1"));
		await proxy.write(scopeEnd("a", "skipped"));

		expect(inner.events.map((event) => event.kind)).toEqual([
			"scope-start",
			"scope-end",
		]);
	});

	test("replays buffered output before scope-end when the scope fails", async () => {
		const inner = new MemorySink<never>();
		const proxy = new TailWindowProxy(inner);

		await proxy.write(scopeStart("a"));
		await proxy.write(output("a", "line 1"));
		await proxy.write(output("a", "line 2"));
		await proxy.write(scopeEnd("a", "failed"));

		expect(inner.events.map((event) => event.kind)).toEqual([
			"scope-start",
			"output",
			"output",
			"scope-end",
		]);
	});

	test("replays buffered output when the scope is cancelled", async () => {
		const inner = new MemorySink<never>();
		const proxy = new TailWindowProxy(inner);

		await proxy.write(scopeStart("a"));
		await proxy.write(output("a", "line 1"));
		await proxy.write(scopeEnd("a", "cancelled"));

		expect(inner.events.map((event) => event.kind)).toEqual([
			"scope-start",
			"output",
			"scope-end",
		]);
	});

	test("evicts the oldest buffered event once the window is full", async () => {
		const inner = new MemorySink<never>();
		const proxy = new TailWindowProxy(inner, { windowSize: 2 });

		await proxy.write(scopeStart("a"));
		await proxy.write(output("a", "line 1"));
		await proxy.write(output("a", "line 2"));
		await proxy.write(output("a", "line 3"));
		await proxy.write(scopeEnd("a", "failed"));

		const chunks = inner.events
			.filter((event) => event.kind === "output")
			.map((event) => event.chunk);
		expect(chunks).toEqual(["line 2", "line 3"]);
	});

	test("keeps independent rings for concurrently open scopes", async () => {
		const inner = new MemorySink<never>();
		const proxy = new TailWindowProxy(inner);

		await proxy.write(scopeStart("a"));
		await proxy.write(scopeStart("b"));
		await proxy.write(output("a", "from a"));
		await proxy.write(output("b", "from b"));
		await proxy.write(scopeEnd("a", "ok"));
		await proxy.write(scopeEnd("b", "failed"));

		const chunks = inner.events
			.filter((event) => event.kind === "output")
			.map((event) => event.chunk);
		expect(chunks).toEqual(["from b"]);
	});

	test("forwards events with no scopeId immediately", async () => {
		const inner = new MemorySink<number>();
		const proxy = new TailWindowProxy<number>(inner);

		await proxy.write({ kind: "data", timestamp: 0, scopeId: null, data: 42 });

		expect(inner.events).toEqual([
			{ kind: "data", timestamp: 0, scopeId: null, data: 42 },
		]);
	});

	test("enabled() delegates to the wrapped sink", () => {
		const inner = {
			write: () => {},
			flush: () => {},
			close: () => {},
			enabled: () => false,
		};
		const proxy = new TailWindowProxy<never>(inner);

		expect(proxy.enabled({ kind: "data" })).toBe(false);
	});

	test("flush()/close() delegate to the wrapped sink", async () => {
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
		const proxy = new TailWindowProxy<never>(inner);

		await proxy.flush();
		await proxy.close();

		expect(flushed).toBe(true);
		expect(closed).toBe(true);
	});
});
