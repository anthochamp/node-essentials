import { describe, expect, it } from "vitest";
import { Semaphore } from "./semaphore.js";

describe("Semaphore", () => {
	it("should acquire and release value correctly", async () => {
		const semaphore = new Semaphore(2);
		expect(semaphore.value).toBe(2);

		const release1 = await semaphore.acquire();
		expect(semaphore.value).toBe(1);

		const release2 = await semaphore.acquire();
		expect(semaphore.value).toBe(0);

		const acquirePromise = semaphore.acquire();
		expect(semaphore.value).toBe(0); // Still 0, as the third acquire is waiting

		release1();
		await acquirePromise; // Now the third acquire should complete
		expect(semaphore.value).toBe(0); // Still 0, as two are acquired

		release2();
		expect(semaphore.value).toBe(1);

		const release3 = await semaphore.acquire();
		expect(semaphore.value).toBe(0);

		release3();
		expect(semaphore.value).toBe(1);
	});

	it("should not allow negative initial value", () => {
		expect(() => new Semaphore(-1)).toThrow(
			"Initial value must be non-negative",
		);
	});

	it("should handle multiple concurrent acquires", async () => {
		const semaphore = new Semaphore(3);
		const releases = await Promise.all([
			semaphore.acquire(),
			semaphore.acquire(),
			semaphore.acquire(),
		]);
		expect(semaphore.value).toBe(0);

		const acquirePromise = semaphore.acquire();
		expect(semaphore.value).toBe(0); // Still 0, as the fourth acquire is waiting

		releases[0]();
		await acquirePromise; // Now the fourth acquire should complete
		expect(semaphore.value).toBe(0); // Still 0, as three are acquired

		releases[1]();
		expect(semaphore.value).toBe(1);

		releases[2]();
		expect(semaphore.value).toBe(2);

		const release4 = await semaphore.acquire();
		expect(semaphore.value).toBe(1);

		release4();
		expect(semaphore.value).toBe(2);
	});

	it("should throw if value exceeds maxValue on release", async () => {
		const semaphore = new Semaphore(2, 1);
		expect(semaphore.value).toBe(1);

		const release1 = await semaphore.acquire();
		expect(semaphore.value).toBe(0);

		release1();
		expect(semaphore.value).toBe(1);

		const release2 = await semaphore.acquire();
		expect(semaphore.value).toBe(0);

		release2();
		expect(semaphore.value).toBe(1);

		semaphore.release(1);
		expect(semaphore.value).toBe(2);

		expect(() => semaphore.release(1)).toThrow(
			"Semaphore released too many times",
		);
	});
});
