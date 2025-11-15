import { describe, expect, it, vi } from "vitest";
import { abortable, abortableAsync } from "./abortable.js";

describe("abortable", () => {
	it("calls original function when not aborted", () => {
		const fn = vi.fn(() => "ok");
		const onAbort = vi.fn();
		const controller = new AbortController();
		const wrapped = abortable(fn, { onAbort, signal: controller.signal });
		const result = wrapped();
		expect(result).toBe("ok");
		expect(fn).toHaveBeenCalled();
		expect(onAbort).not.toHaveBeenCalled();
	});

	it("calls onAbort if signal is aborted before call", () => {
		const fn = vi.fn();
		const onAbort = vi.fn();
		const controller = new AbortController();
		controller.abort();
		const wrapped = abortable(fn, { onAbort, signal: controller.signal });
		wrapped();
		expect(onAbort).toHaveBeenCalled();
		expect(fn).toHaveBeenCalled();
	});

	it("calls onAbort if signal is aborted during execution", () => {
		const fn = vi.fn(() => {
			controller.abort();
			return "aborted";
		});
		const onAbort = vi.fn();
		const controller = new AbortController();
		const wrapped = abortable(fn, { onAbort, signal: controller.signal });
		wrapped();
		expect(onAbort).toHaveBeenCalled();
		expect(fn).toHaveBeenCalled();
	});
});

describe("abortableAsync", () => {
	it("calls original async function when not aborted", async () => {
		const fn = vi.fn(async () => "async-ok");
		const onAbort = vi.fn();
		const controller = new AbortController();
		const wrapped = abortableAsync(fn, { onAbort, signal: controller.signal });
		const result = await wrapped();
		expect(result).toBe("async-ok");
		expect(fn).toHaveBeenCalled();
		expect(onAbort).not.toHaveBeenCalled();
	});

	it("calls onAbort if signal is aborted before async call", async () => {
		const fn = vi.fn(async () => "should-run");
		const onAbort = vi.fn();
		const controller = new AbortController();
		controller.abort();
		const wrapped = abortableAsync(fn, { onAbort, signal: controller.signal });
		await wrapped();
		expect(onAbort).toHaveBeenCalled();
		expect(fn).toHaveBeenCalled();
	});

	it("calls onAbort if signal is aborted during async execution", async () => {
		const fn = vi.fn(async () => {
			controller.abort();
			return "aborted-async";
		});
		const onAbort = vi.fn();
		const controller = new AbortController();
		const wrapped = abortableAsync(fn, { onAbort, signal: controller.signal });
		await wrapped();
		expect(onAbort).toHaveBeenCalled();
		expect(fn).toHaveBeenCalled();
	});
});
