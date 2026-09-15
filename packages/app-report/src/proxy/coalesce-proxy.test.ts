import { expect, suite, test, vi } from "vitest";

import type { ReportEvent } from "../events.js";
import type { ISink } from "../sink.js";
import { createCoalesceProxy } from "./coalesce-proxy.js";

function progress(scopeId: string, completed: number): ReportEvent<never> {
	return { kind: "scope-progress", timestamp: completed, scopeId, completed };
}

function scopeEnd(scopeId: string): ReportEvent<never> {
	return {
		kind: "scope-end",
		timestamp: 0,
		scopeId,
		status: "ok",
		durationMs: 0,
	};
}

function fakeSink(): ISink<never> {
	return {
		write: vi.fn(),
		flush: vi.fn(),
		close: vi.fn(),
	};
}

const byScopeId = (event: ReportEvent<never>) =>
	event.kind === "scope-progress" ? event.scopeId : null;

suite("createCoalesceProxy", () => {
	test("collapses consecutive same-key events, keeping only the newest", async () => {
		const inner = fakeSink();
		const proxy = createCoalesceProxy(inner, { keyOf: byScopeId });

		await proxy.write(progress("a", 1));
		await proxy.write(progress("a", 2));
		await proxy.write(progress("a", 3));
		await proxy.flush();

		expect(inner.write).toHaveBeenCalledTimes(1);
		expect(inner.write).toHaveBeenCalledWith(progress("a", 3), undefined);
	});

	test("flushes the pending event before writing one with a different key", async () => {
		const inner = fakeSink();
		const proxy = createCoalesceProxy(inner, { keyOf: byScopeId });

		await proxy.write(progress("a", 1));
		await proxy.write(progress("b", 1));

		expect(inner.write).toHaveBeenCalledTimes(1);
		expect(inner.write).toHaveBeenCalledWith(progress("a", 1), undefined);
	});

	test("passes a keyOf-null event straight through, flushing any pending one first", async () => {
		const inner = fakeSink();
		const proxy = createCoalesceProxy(inner, { keyOf: byScopeId });

		await proxy.write(progress("a", 1));
		await proxy.write(scopeEnd("a"));

		expect(inner.write).toHaveBeenCalledTimes(2);
		expect(inner.write).toHaveBeenNthCalledWith(1, progress("a", 1), undefined);
		expect(inner.write).toHaveBeenNthCalledWith(2, scopeEnd("a"), undefined);
	});

	test("flush() writes a pending event to the wrapped sink", async () => {
		const inner = fakeSink();
		const proxy = createCoalesceProxy(inner, { keyOf: byScopeId });

		await proxy.write(progress("a", 1));
		expect(inner.write).not.toHaveBeenCalled();

		await proxy.flush();
		expect(inner.write).toHaveBeenCalledTimes(1);
		expect(inner.write).toHaveBeenCalledWith(progress("a", 1), undefined);
	});

	test("close() flushes a pending event before closing the wrapped sink", async () => {
		const inner = fakeSink();
		const proxy = createCoalesceProxy(inner, { keyOf: byScopeId });

		await proxy.write(progress("a", 1));
		await proxy.close();

		expect(inner.write).toHaveBeenCalledTimes(1);
		expect(inner.write).toHaveBeenCalledWith(progress("a", 1), undefined);
		expect(inner.close).toHaveBeenCalledTimes(1);
	});

	test("maxHoldMs force-flushes a pending event even with no new arrival", async () => {
		vi.useFakeTimers();
		try {
			const inner = fakeSink();
			const proxy = createCoalesceProxy(inner, {
				keyOf: byScopeId,
				maxHoldMs: 50,
			});

			await proxy.write(progress("a", 1));
			expect(inner.write).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(50);
			expect(inner.write).toHaveBeenCalledTimes(1);
			expect(inner.write).toHaveBeenCalledWith(progress("a", 1), undefined);
		} finally {
			vi.useRealTimers();
		}
	});
});
