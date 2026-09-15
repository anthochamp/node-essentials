import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { Mutex } from "@ac-kit/async";
import { Mutex as AsyncMutex } from "async-mutex";

const WORKERS = 64;
const CYCLES_PER_WORKER = 200;
const TOTAL_CYCLES = WORKERS * CYCLES_PER_WORKER;

durationCondition("Lock — 64 workers contending, 200 cycles each", () => {
	durationCase("@ac-kit/.Mutex", { tags: { kind: "js" } }, async () => {
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
	});
	durationCase(
		"async-mutex Mutex (npm)",
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
