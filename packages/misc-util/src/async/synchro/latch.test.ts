import { describe, expect, it } from "vitest";
import { Latch } from "./latch.js";

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Latch", () => {
	it("should not resolve waiters until released", async () => {
		const latch = new Latch(1);
		let resolved = false;
		const waiter = latch.wait().then(() => {
			resolved = true;
		});
		await delay(10);
		expect(resolved).toBe(false);
		latch.countDown();
		await waiter;
		expect(resolved).toBe(true);
	});

	it("should resolve immediately if already released", async () => {
		const latch = new Latch(1);
		latch.countDown();
		await expect(latch.wait()).resolves.toBeUndefined();
	});

	it("should resolve all concurrent waiters when released", async () => {
		const latch = new Latch(2);
		let resolved1 = false,
			resolved2 = false;
		const w1 = latch.wait().then(() => {
			resolved1 = true;
		});
		const w2 = latch.wait().then(() => {
			resolved2 = true;
		});
		latch.countDown();
		latch.countDown();
		await Promise.all([w1, w2]);
		expect(resolved1).toBe(true);
		expect(resolved2).toBe(true);
	});

	it("should support aborting wait with AbortSignal", async () => {
		const latch = new Latch(1);
		const ac = new AbortController();
		const p = latch.wait(ac.signal);
		ac.abort();
		await expect(p).rejects.toThrow();
	});

	it("should be one-shot: further waiters resolve immediately after release", async () => {
		const latch = new Latch(1);
		latch.countDown();
		await expect(latch.wait()).resolves.toBeUndefined();
		await expect(latch.wait()).resolves.toBeUndefined();
	});
});
