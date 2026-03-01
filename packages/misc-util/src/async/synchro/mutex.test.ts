import { expect, suite, test } from "vitest";
import { LockNotAcquiredError } from "./ilock.js";
import { Mutex } from "./mutex.js";

suite("Mutex", () => {
	test("should acquire and release lock correctly", async () => {
		const mutex = new Mutex();
		expect(mutex.locked).toBe(false);

		await mutex.lock();
		expect(mutex.locked).toBe(true);

		const acquirePromise = mutex.lock();
		expect(mutex.locked).toBe(true); // Still locked, as the second acquire is waiting

		mutex.unlock();
		await acquirePromise; // Now the second acquire should complete
		expect(mutex.locked).toBe(true); // Still locked, as one is acquired

		mutex.unlock();
		expect(mutex.locked).toBe(false);
	});

	test("should handle multiple concurrent acquires", async () => {
		const mutex = new Mutex();

		const acquire1Promise = mutex.lock();
		const acquire2Promise = mutex.lock();

		await acquire1Promise;
		expect(mutex.locked).toBe(true);

		mutex.unlock();
		await acquire2Promise;
		expect(mutex.locked).toBe(true); // Still locked, as 2 is acquired

		mutex.unlock();
		expect(mutex.locked).toBe(false);
	});

	test("should throw if release is called more than acquire", async () => {
		const mutex = new Mutex();

		await mutex.lock();
		expect(mutex.locked).toBe(true);

		mutex.unlock();
		expect(mutex.locked).toBe(false);

		expect(() => mutex.unlock()).toThrow(LockNotAcquiredError);
	});

	test("should support aborting acquire with AbortSignal", async () => {
		const mutex = new Mutex();
		const controller = new AbortController();
		await mutex.lock(); // take the only permit
		const acquirePromise = mutex.lock(controller.signal);
		controller.abort("abort-mutex");
		await expect(acquirePromise).rejects.toBe("abort-mutex");
	});

	test("should throw LockNotAcquiredError if release called without acquire", () => {
		const mutex = new Mutex();
		expect(() => mutex.unlock()).toThrow(LockNotAcquiredError);
	});
});
