import { describe, expect, it } from "vitest";
import { Mutex } from "./mutex.js";

describe("Mutex", () => {
	it("should acquire and release lock correctly", async () => {
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

	it("should handle multiple concurrent acquires", async () => {
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

	it("should throw if release is called more than acquire", async () => {
		const mutex = new Mutex();

		const release = await mutex.acquire();
		expect(mutex.locked).toBe(true);

		release();
		expect(mutex.locked).toBe(false);

		expect(() => release()).toThrow("Lock already released");
	});
});
