import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";

const CYCLES = 10_000;

durationCondition(
	"Promise deferred — resolve via queueMicrotask (lock-primitive shape)",
	() => {
		durationCase(
			"await null",
			{ tags: { kind: "native", role: "floor" } },
			async () => {
				let counter = 0;
				for (let index = 0; index < CYCLES; index++) {
					// oxlint-disable-next-line no-unused-expressions
					null;
					counter++;
				}
				assert.strictEqual(counter, CYCLES);
			},
		);
		durationCase(
			"new Promise — inline capture",
			{ tags: { kind: "js" } },
			async () => {
				let counter = 0;
				for (let index = 0; index < CYCLES; index++) {
					let resolve!: () => void;
					const promise = new Promise<void>((res) => {
						resolve = res;
					});
					queueMicrotask(resolve);
					await promise;
					counter++;
				}
				assert.strictEqual(counter, CYCLES);
			},
		);
		durationCase(
			"Promise.withResolvers()",
			{ tags: { kind: "js" } },
			async () => {
				let counter = 0;
				for (let index = 0; index < CYCLES; index++) {
					const { promise, resolve } = Promise.withResolvers<void>();
					queueMicrotask(resolve);
					await promise;
					counter++;
				}
				assert.strictEqual(counter, CYCLES);
			},
		);
	},
);
