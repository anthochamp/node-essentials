import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { Mutex, Semaphore } from "@ac-kit/async";
import { Mutex as AsyncMutex } from "async-mutex";

const CYCLES = 10_000;

durationCondition("Lock — 10 000 uncontended acquire/release cycles", () => {
	durationCase(
		"await Promise.resolve()",
		{ tags: { kind: "native", role: "floor" } },
		async () => {
			let counter = 0;
			for (let index = 0; index < CYCLES; index++) {
				await Promise.resolve();
				counter++;
			}
			assert.strictEqual(counter, CYCLES);
		},
	);
	durationCase(
		"@ac-kit/.Mutex.lock",
		{ tags: { kind: "js", role: "lock" } },
		async () => {
			const mutex = new Mutex();
			let counter = 0;
			for (let index = 0; index < CYCLES; index++) {
				await mutex.lock();
				counter++;
				mutex.unlock();
			}
			assert.strictEqual(counter, CYCLES);
		},
	);
	durationCase(
		"@ac-kit/.Mutex.tryLock",
		{ tags: { kind: "js", role: "lock, no await" } },
		() => {
			const mutex = new Mutex();
			let counter = 0;
			for (let index = 0; index < CYCLES; index++) {
				if (mutex.tryLock()) {
					counter++;
					mutex.unlock();
				}
			}
			assert.strictEqual(counter, CYCLES);
		},
	);
	durationCase(
		"@ac-kit/.Semaphore(1)",
		{ tags: { kind: "js", role: "lock" } },
		async () => {
			const semaphore = new Semaphore(1);
			let counter = 0;
			for (let index = 0; index < CYCLES; index++) {
				await semaphore.acquire();
				counter++;
				semaphore.release();
			}
			assert.strictEqual(counter, CYCLES);
		},
	);
	durationCase(
		"async-mutex Mutex (npm)",
		{ tags: { kind: "js", role: "lock" } },
		async () => {
			const mutex = new AsyncMutex();
			let counter = 0;
			for (let index = 0; index < CYCLES; index++) {
				const release = await mutex.acquire();
				counter++;
				release();
			}
			assert.strictEqual(counter, CYCLES);
		},
	);
});
