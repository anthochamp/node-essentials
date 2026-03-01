import { expect, suite, test } from "vitest";
import { Semaphore } from "./semaphore.js";

suite("Semaphore", () => {
	test("should acquire and release value correctly", async () => {
		const semaphore = new Semaphore(2);
		expect(semaphore.value).toBe(2);

		await semaphore.acquire();
		expect(semaphore.value).toBe(1);

		await semaphore.acquire();
		expect(semaphore.value).toBe(0);

		const acquirePromise = semaphore.acquire();
		expect(semaphore.value).toBe(0); // Still 0, as the third acquire is waiting

		semaphore.release();
		await acquirePromise; // Now the third acquire should complete
		expect(semaphore.value).toBe(0); // Still 0, as two are acquired

		semaphore.release();
		expect(semaphore.value).toBe(1);

		await semaphore.acquire();
		expect(semaphore.value).toBe(0);

		semaphore.release();
		expect(semaphore.value).toBe(1);
	});

	test("should not allow negative initial value", () => {
		expect(() => new Semaphore(-1)).toThrow(
			"Initial value must be non-negative",
		);
	});

	test("should handle multiple concurrent acquires", async () => {
		const semaphore = new Semaphore(3);
		await Promise.all([
			semaphore.acquire(),
			semaphore.acquire(),
			semaphore.acquire(),
		]);
		expect(semaphore.value).toBe(0);

		const acquirePromise = semaphore.acquire();
		expect(semaphore.value).toBe(0); // Still 0, as the fourth acquire is waiting

		semaphore.release();
		await acquirePromise; // Now the fourth acquire should complete
		expect(semaphore.value).toBe(0); // Still 0, as three are acquired

		semaphore.release();
		expect(semaphore.value).toBe(1);

		semaphore.release();
		expect(semaphore.value).toBe(2);

		await semaphore.acquire();
		expect(semaphore.value).toBe(1);

		semaphore.release();
		expect(semaphore.value).toBe(2);
	});

	test("should throw if value exceeds maxValue on release", async () => {
		const semaphore = new Semaphore(2, 1);
		expect(semaphore.value).toBe(1);

		await semaphore.acquire();
		expect(semaphore.value).toBe(0);

		semaphore.release();
		expect(semaphore.value).toBe(1);

		await semaphore.acquire();
		expect(semaphore.value).toBe(0);

		semaphore.release();
		expect(semaphore.value).toBe(1);

		semaphore.release();
		expect(semaphore.value).toBe(2);

		expect(() => semaphore.release(1)).toThrow(
			"Semaphore released too many times",
		);
	});

	test("should support tryAcquire and fail when insufficient permits", async () => {
		const semaphore = new Semaphore(2);
		expect(semaphore.tryAcquire()).toBe(true);
		expect(semaphore.value).toBe(1);
		expect(semaphore.tryAcquire(2)).toBe(false);
		expect(semaphore.value).toBe(1);
		semaphore.release(1);
		expect(semaphore.value).toBe(2);
	});

	test("should throw on invalid acquire/release counts", async () => {
		const semaphore = new Semaphore(2);
		expect(() => semaphore.tryAcquire(0)).toThrow("Count must be positive");
		expect(() => semaphore.release(-1)).toThrow("Count must be positive");
	});

	test("should support maxValue getter", () => {
		const semaphore = new Semaphore(5);
		expect(semaphore.getMaxValue()).toBe(5);
	});

	test("should support aborting acquire with AbortSignal", async () => {
		const semaphore = new Semaphore(1);
		const controller = new AbortController();
		await semaphore.acquire(); // take the only permit
		const acquirePromise = semaphore.acquire(1, controller.signal);
		controller.abort("abort-acquire");
		await expect(acquirePromise).rejects.toBe("abort-acquire");
	});
});
