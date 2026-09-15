import { expect, suite, test } from "vitest";

import { rejectOnUncaught } from "./guarded.js";

suite("rejectOnUncaught", () => {
	test("resolves with the work's return value", async () => {
		await expect(rejectOnUncaught(() => 42)).resolves.toBe(42);
	});

	test("resolves with the work's resolved value", async () => {
		await expect(rejectOnUncaught(() => Promise.resolve(42))).resolves.toBe(42);
	});

	test("rejects when work throws synchronously", async () => {
		await expect(
			rejectOnUncaught(() => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");
	});

	test("rejects when work rejects", async () => {
		await expect(
			rejectOnUncaught(() => Promise.reject(new Error("boom"))),
		).rejects.toThrow("boom");
	});

	test("rejects when work crashes via an uncaught exception outside the promise chain", async () => {
		const pending = rejectOnUncaught(() => {
			setImmediate(() => {
				throw new Error("crash");
			});
			return new Promise<number>(() => {});
		});

		await expect(pending).rejects.toThrow("crash");
	});

	test("does not leave a dangling uncaughtException listener after settling", async () => {
		const before = process.listenerCount("uncaughtException");
		await rejectOnUncaught(() => 1);
		expect(process.listenerCount("uncaughtException")).toBe(before);
	});
});
