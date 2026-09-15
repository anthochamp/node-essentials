import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";

const CYCLES = 10_000;

async function asyncShape(): Promise<void> {
	let resolve!: () => void;
	const p = new Promise<void>((res) => {
		resolve = res;
	});
	queueMicrotask(resolve);
	await p;
}

function inlineShape(): Promise<void> {
	return new Promise<void>((resolve) => {
		queueMicrotask(resolve);
	});
}

durationCondition(
	"Promise chain depth — async function vs return new Promise",
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
			"async function — inner await (2 chain links)",
			{ tags: { kind: "js" } },
			async () => {
				let counter = 0;
				for (let index = 0; index < CYCLES; index++) {
					await asyncShape();
					counter++;
				}
				assert.strictEqual(counter, CYCLES);
			},
		);
		durationCase(
			"return new Promise (1 chain link)",
			{ tags: { kind: "js" } },
			async () => {
				let counter = 0;
				for (let index = 0; index < CYCLES; index++) {
					await inlineShape();
					counter++;
				}
				assert.strictEqual(counter, CYCLES);
			},
		);
	},
);
