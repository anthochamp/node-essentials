import { expect, suite, test } from "vitest";
import { LockNotAcquiredError } from "./ilockable.js";
import { Mutex } from "./mutex.js";

suite("Mutex", () => {
	test("should acquire and release lock correctly", async () => {
		const mutex = new Mutex();
		expect(mutex.locked).toBe(false);

		const release1 = await mutex.acquire();
		expect(mutex.locked).toBe(true);

		const acquirePromise = mutex.acquire();
		expect(mutex.locked).toBe(true); // Still locked, as the second acquire is waiting

		release1();
		const release2 = await acquirePromise; // Now the second acquire should complete
		expect(mutex.locked).toBe(true); // Still locked, as one is acquired

		release2();
		expect(mutex.locked).toBe(false);
	});

	test("should handle multiple concurrent acquires", async () => {
		const mutex = new Mutex();

		const acquire1Promise = mutex.acquire();
		const acquire2Promise = mutex.acquire();

		const release1 = await acquire1Promise;
		expect(mutex.locked).toBe(true);

		release1();
		const release2 = await acquire2Promise;
		expect(mutex.locked).toBe(true); // Still locked, as 2 is acquired

		release2();
		expect(mutex.locked).toBe(false);
	});

	test("should throw if release is called more than acquire", async () => {
		const mutex = new Mutex();

		const release = await mutex.acquire();
		expect(mutex.locked).toBe(true);

		release();
		expect(mutex.locked).toBe(false);

		expect(() => release()).toThrow(LockNotAcquiredError);
	});

	test("should support aborting acquire with AbortSignal", async () => {
		const mutex = new Mutex();
		const controller = new AbortController();
		await mutex.acquire(); // take the only permit
		const acquirePromise = mutex.acquire(controller.signal);
		controller.abort("abort-mutex");
		await expect(acquirePromise).rejects.toBe("abort-mutex");
	});

	test("should throw LockNotAcquiredError if release called without acquire", () => {
		const mutex = new Mutex();
		expect(() => mutex.release()).toThrow(LockNotAcquiredError);
	});
});
