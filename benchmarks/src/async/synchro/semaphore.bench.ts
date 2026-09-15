import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { Semaphore } from "@ac-kit/async";
import { Semaphore as AsyncSemaphore } from "async-mutex";
import pLimit from "p-limit";

const WORKERS = 64;
const CYCLES_PER_WORKER = 200;
const TOTAL_CYCLES = WORKERS * CYCLES_PER_WORKER;
const PERMITS = 8;

durationCondition(
	"Semaphore — 64 workers sharing 8 permits, 200 cycles each",
	() => {
		durationCase("@ac-kit/.Semaphore", { tags: { kind: "js" } }, async () => {
			const semaphore = new Semaphore(PERMITS);
			let counter = 0;
			await Promise.all(
				Array.from({ length: WORKERS }, async () => {
					for (let index = 0; index < CYCLES_PER_WORKER; index++) {
						await semaphore.acquire();
						counter++;
						semaphore.release();
					}
				}),
			);
			assert.strictEqual(counter, TOTAL_CYCLES);
		});
		durationCase(
			"async-mutex Semaphore (npm)",
			{ tags: { kind: "js" } },
			async () => {
				const semaphore = new AsyncSemaphore(PERMITS);
				let counter = 0;
				await Promise.all(
					Array.from({ length: WORKERS }, async () => {
						for (let index = 0; index < CYCLES_PER_WORKER; index++) {
							const [, release] = await semaphore.acquire();
							counter++;
							release();
						}
					}),
				);
				assert.strictEqual(counter, TOTAL_CYCLES);
			},
		);
		durationCase("p-limit(8) (npm)", { tags: { kind: "js" } }, async () => {
			const limit = pLimit(PERMITS);
			let counter = 0;
			await Promise.all(
				Array.from({ length: WORKERS }, async () => {
					for (let index = 0; index < CYCLES_PER_WORKER; index++) {
						await limit(() => {
							counter++;
						});
					}
				}),
			);
			assert.strictEqual(counter, TOTAL_CYCLES);
		});
	},
);
