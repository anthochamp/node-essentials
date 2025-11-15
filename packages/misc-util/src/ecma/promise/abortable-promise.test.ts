import { describe, expect, it, vi } from "vitest";
import { AbortablePromise } from "./abortable-promise.js";

// Helper for promise-based setTimeout
function wait(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

describe("AbortablePromise", () => {
	it("resolves when not aborted", async () => {
		const controller = new AbortController();
		const promise = new AbortablePromise<string>(
			async (resolve) => {
				await wait(10);
				resolve("done");
			},
			{
				onAbort: vi.fn(),
				signal: controller.signal,
			},
		);
		await expect(promise).resolves.toBe("done");
	});

	it("rejects and calls onAbort if aborted before resolve", async () => {
		const controller = new AbortController();
		const onAbort = vi.fn();
		const promise = new AbortablePromise<string>(
			async (resolve) => {
				await wait(20);
				resolve("should not resolve");
			},
			{
				onAbort,
				signal: controller.signal,
			},
		);
		controller.abort("abort-reason");
		await expect(promise).rejects.toBe("abort-reason");
		expect(onAbort).toHaveBeenCalledWith("abort-reason");
	});

	it("calls onAbort and rejects immediately if signal already aborted", async () => {
		const controller = new AbortController();
		controller.abort("already-aborted");
		const onAbort = vi.fn();
		const promise = new AbortablePromise<string>(
			async (resolve) => {
				await wait(10);
				resolve("should not resolve");
			},
			{
				onAbort,
				signal: controller.signal,
			},
		);
		await expect(promise).rejects.toBe("already-aborted");
		expect(onAbort).toHaveBeenCalledWith("already-aborted");
	});

	it("executor is called even if aborted", async () => {
		const controller = new AbortController();
		controller.abort();
		const executor = vi.fn();
		const promise = new AbortablePromise<string>(executor, {
			onAbort: vi.fn(),
			signal: controller.signal,
		});
		await expect(promise).rejects.toBeDefined();
		expect(executor).toHaveBeenCalled();
	});

	it("then/catch/finally work as expected", async () => {
		const controller = new AbortController();
		const promise = new AbortablePromise<string>(
			async (resolve) => {
				await wait(10);
				resolve("ok");
			},
			{
				onAbort: vi.fn(),
				signal: controller.signal,
			},
		);
		const thenResult = await promise.then((v) => `${v}!`);
		expect(thenResult).toBe("ok!");
		const catchResult = await promise.catch(() => "fallback");
		expect(catchResult).toBe("ok");
		let finallyCalled = false;
		await promise.finally(() => {
			finallyCalled = true;
		});
		expect(finallyCalled).toBe(true);
	});
});

describe("AbortablePromise.withResolvers", () => {
	it("resolves via resolve()", async () => {
		const controller = new AbortController();
		const onAbort = vi.fn();
		const { promise, resolve } = AbortablePromise.withResolvers<string>({
			onAbort,
			signal: controller.signal,
		});
		resolve("resolved-value");
		await expect(promise).resolves.toBe("resolved-value");
		expect(onAbort).not.toHaveBeenCalled();
	});

	it("rejects via reject()", async () => {
		const controller = new AbortController();
		const onAbort = vi.fn();
		const { promise, reject } = AbortablePromise.withResolvers<string>({
			onAbort,
			signal: controller.signal,
		});
		reject("rejected-value");
		await expect(promise).rejects.toBe("rejected-value");
		expect(onAbort).not.toHaveBeenCalled();
	});

	it("rejects and calls onAbort if aborted before resolve", async () => {
		const controller = new AbortController();
		const onAbort = vi.fn();
		const { promise } = AbortablePromise.withResolvers<string>({
			onAbort,
			signal: controller.signal,
		});
		controller.abort("abort-withResolvers");
		await expect(promise).rejects.toBe("abort-withResolvers");
		expect(onAbort).toHaveBeenCalledWith("abort-withResolvers");
	});

	it("calls onAbort and rejects immediately if signal already aborted", async () => {
		const controller = new AbortController();
		controller.abort("already-aborted-withResolvers");
		const onAbort = vi.fn();
		const { promise } = AbortablePromise.withResolvers<string>({
			onAbort,
			signal: controller.signal,
		});
		await expect(promise).rejects.toBe("already-aborted-withResolvers");
		expect(onAbort).toHaveBeenCalledWith("already-aborted-withResolvers");
	});
});
