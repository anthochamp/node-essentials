import { expect, suite, test, vi } from "vitest";

import { catchSilently, catchSilentlyAsync } from "./settle.js";

suite("catchSilentlyAsync", () => {
	test("resolves with the work's return value", async () => {
		await expect(catchSilentlyAsync(() => 42)).resolves.toBe(42);
	});

	test("resolves with the work's resolved value", async () => {
		await expect(catchSilentlyAsync(() => Promise.resolve(42))).resolves.toBe(
			42,
		);
	});

	test("resolves to undefined when work throws synchronously", async () => {
		await expect(
			catchSilentlyAsync(() => {
				throw new Error("boom");
			}),
		).resolves.toBeUndefined();
	});

	test("resolves to undefined when work rejects", async () => {
		await expect(
			catchSilentlyAsync(() => Promise.reject(new Error("boom"))),
		).resolves.toBeUndefined();
	});

	test("is a no-op when work is omitted or null", async () => {
		await expect(catchSilentlyAsync()).resolves.toBeUndefined();
		await expect(catchSilentlyAsync(null)).resolves.toBeUndefined();
	});

	test("never surfaces the error out of band, unlike catchOutOfBandAsync", async () => {
		const uncaughtExceptionHandler = vi.fn();
		process.on("uncaughtException", uncaughtExceptionHandler);

		try {
			await catchSilentlyAsync(() => {
				throw new Error("boom");
			});
			await new Promise((resolve) => setImmediate(resolve));

			expect(uncaughtExceptionHandler).not.toHaveBeenCalled();
		} finally {
			process.off("uncaughtException", uncaughtExceptionHandler);
		}
	});
});

suite("catchSilently", () => {
	test("returns the work's return value", () => {
		expect(catchSilently(() => 42)).toBe(42);
	});

	test("returns undefined when work throws", () => {
		expect(
			catchSilently(() => {
				throw new Error("boom");
			}),
		).toBeUndefined();
	});

	test("is a no-op when work is omitted or null", () => {
		expect(catchSilently()).toBeUndefined();
		expect(catchSilently(null)).toBeUndefined();
	});
});
