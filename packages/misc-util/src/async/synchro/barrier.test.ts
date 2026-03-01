import { describe, expect, it } from "vitest";
import { Barrier } from "./barrier.js";

// Helper to wait for a short time
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Barrier", () => {
	it("should resolve all waiters when count is reached", async () => {
		const barrier = new Barrier(2);
		let resolved1 = false;
		let resolved2 = false;
		const waiter1 = barrier.wait().then(() => {
			resolved1 = true;
		});
		const waiter2 = barrier.wait().then(() => {
			resolved2 = true;
		});
		await Promise.all([waiter1, waiter2]);
		expect(resolved1).toBe(true);
		expect(resolved2).toBe(true);
	});

	it("should reset and allow reuse for multiple rounds", async () => {
		const barrier = new Barrier(2);
		let round1 = false;
		let round2 = false;
		// First round
		const w1 = barrier.wait().then(() => {
			round1 = true;
		});
		const w2 = barrier.wait();
		await Promise.all([w1, w2]);
		expect(round1).toBe(true);
		// Second round
		const w3 = barrier.wait().then(() => {
			round2 = true;
		});
		const w4 = barrier.wait();
		await Promise.all([w3, w4]);
		expect(round2).toBe(true);
	});

	it("should not resolve until enough waiters arrive", async () => {
		const barrier = new Barrier(3);
		let resolved = false;
		const waiter = barrier.wait().then(() => {
			resolved = true;
		});
		await wait(10);
		expect(resolved).toBe(false);
		// Add remaining waiters
		const w2 = barrier.wait();
		const w3 = barrier.wait();
		await Promise.all([waiter, w2, w3]);
		expect(resolved).toBe(true);
	});

	it("should throw if count is not positive", () => {
		expect(() => new Barrier(0)).toThrowError("Barrier count must be positive");
		expect(() => new Barrier(-1)).toThrowError(
			"Barrier count must be positive",
		);
	});

	it("should support AbortSignal for wait", async () => {
		const barrier = new Barrier(2);
		const ac = new AbortController();
		const p = barrier.wait(ac.signal);
		ac.abort();
		await expect(p).rejects.toThrowError();
	});

	it("should resolve extra waiters in the next round if more than count waiters arrive", async () => {
		const barrier = new Barrier(2);
		let resolved1 = false;
		let resolved2 = false;
		let resolved3 = false;
		// First two waiters should resolve together
		const waiter1 = barrier.wait().then(() => {
			resolved1 = true;
		});
		const waiter2 = barrier.wait().then(() => {
			resolved2 = true;
		});
		// Third waiter should wait for the next round
		const waiter3 = barrier.wait().then(() => {
			resolved3 = true;
		});
		await Promise.all([waiter1, waiter2]);
		expect(resolved1).toBe(true);
		expect(resolved2).toBe(true);
		expect(resolved3).toBe(false);
		// Add another waiter to complete the next round
		const waiter4 = barrier.wait();
		await Promise.all([waiter3, waiter4]);
		expect(resolved3).toBe(true);
	});
});
