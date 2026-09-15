import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { Mutex, RwLock } from "@ac-kit/async";
import { Mutex as AsyncMutex } from "async-mutex";

const WORKERS = 64;
const CYCLES_PER_WORKER = 200;
const TOTAL_CYCLES = WORKERS * CYCLES_PER_WORKER;
const isWriter = (worker: number) => worker % 8 === 0;

durationCondition("Read-write lock — 64 workers, one writer in eight", () => {
	durationCase("@ac-kit/.RwLock", { tags: { kind: "js" } }, async () => {
		const lock = new RwLock();
		let counter = 0;
		await Promise.all(
			Array.from({ length: WORKERS }, async (_, worker) => {
				for (let index = 0; index < CYCLES_PER_WORKER; index++) {
					if (isWriter(worker)) {
						await lock.writeLock();
						counter++;
						lock.writeUnlock();
					} else {
						await lock.readLock();
						counter++;
						lock.readUnlock();
					}
				}
			}),
		);
		assert.strictEqual(counter, TOTAL_CYCLES);
	});
	durationCase(
		"@ac-kit/.Mutex for everything",
		{ tags: { kind: "js" } },
		async () => {
			const mutex = new Mutex();
			let counter = 0;
			await Promise.all(
				Array.from({ length: WORKERS }, async () => {
					for (let index = 0; index < CYCLES_PER_WORKER; index++) {
						await mutex.lock();
						counter++;
						mutex.unlock();
					}
				}),
			);
			assert.strictEqual(counter, TOTAL_CYCLES);
		},
	);
	durationCase(
		"async-mutex Mutex for everything (npm)",
		{ tags: { kind: "js" } },
		async () => {
			const mutex = new AsyncMutex();
			let counter = 0;
			await Promise.all(
				Array.from({ length: WORKERS }, async () => {
					for (let index = 0; index < CYCLES_PER_WORKER; index++) {
						const release = await mutex.acquire();
						counter++;
						release();
					}
				}),
			);
			assert.strictEqual(counter, TOTAL_CYCLES);
		},
	);
});
