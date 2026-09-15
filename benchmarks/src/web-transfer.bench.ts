import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { resourceCase, resourceCondition } from "@ac-bench/measure-resource";

/**
 * One operation — handing a batch of numeric values to another agent — measured
 * across the shapes this repository's numeric types could take.
 *
 * The question is not really speed, it is whether a copy happens at all. Only
 * an `ArrayBuffer` is _Transferable_: it can be moved to a worker with no copy,
 * leaving the sender's view detached. Everything else — an array of tuples, an
 * array of objects — is _cloneable_, which means the structured-clone algorithm
 * walks it and rebuilds it on the other side. That difference does not shrink
 * with tuning; it is a property of the platform, and it is the whole of the
 * answer to "are these types transferable to Web APIs".
 */

const COUNT = 100_000;

const SAMPLING = {
	warmup: 3,
	minRuns: 10,
	maxRuns: 60,
	minTimeMs: 200,
	maxTimeMs: 4_000,
	subtractHarnessOverhead: true,
} as const;

function component(index: number, phase: number): number {
	return (((index + 1) * phase) % 256) / 4;
}

function registerContenders_(
	register: (
		name: string,
		tags: Record<string, string>,
		run: () => void,
	) => void,
): void {
	const tuples = Array.from(
		{ length: COUNT },
		(_unused, index) =>
			[component(index, 7), component(index, 13), component(index, 29)] as [
				number,
				number,
				number,
			],
	);
	const objects = Array.from({ length: COUNT }, (_unused, index) => ({
		x: component(index, 7),
		y: component(index, 13),
		z: component(index, 29),
	}));
	const flat = new Float64Array(COUNT * 3);
	for (let index = 0; index < COUNT; index++) {
		flat[index * 3] = component(index, 7);
		flat[index * 3 + 1] = component(index, 13);
		flat[index * 3 + 2] = component(index, 29);
	}

	register(
		"structuredClone — [x,y,z][] tuples",
		{ shape: "tuple[]", zeroCopy: "no" },
		() => {
			const copy = structuredClone(tuples);
			assert.strictEqual(copy.length, COUNT);
		},
	);

	register(
		"structuredClone — {x,y,z}[] objects",
		{ shape: "object[]", zeroCopy: "no" },
		() => {
			const copy = structuredClone(objects);
			assert.strictEqual(copy.length, COUNT);
		},
	);

	register(
		"structuredClone — Float64Array (copied)",
		{ shape: "f64", zeroCopy: "no" },
		() => {
			const copy = structuredClone(flat);
			assert.strictEqual(copy.length, flat.length);
		},
	);

	register(
		"structuredClone — ArrayBuffer in the transfer list",
		{ shape: "f64", zeroCopy: "yes" },
		() => {
			// A transfer detaches the source, so each iteration needs its own
			// buffer. The allocation is part of the honest cost of transferring.
			const owned = new Float64Array(flat);
			const buffer = owned.buffer;
			const moved = structuredClone(buffer, { transfer: [buffer] });
			assert.strictEqual(moved.byteLength, COUNT * 3 * 8);
			assert.strictEqual(buffer.byteLength, 0);
		},
	);

	register(
		"baseline — allocate the same buffer, transfer nothing",
		{ shape: "f64", zeroCopy: "n/a" },
		() => {
			const owned = new Float64Array(flat);
			assert.strictEqual(owned.length, flat.length);
		},
	);
}

durationCondition(
	`Hand off ${COUNT.toLocaleString("en-US")} three-component values`,
	{ sampling: SAMPLING },
	() => {
		registerContenders_((name, tags, run) => durationCase(name, { tags }, run));
	},
);

resourceCondition(
	`Hand off ${COUNT.toLocaleString("en-US")} three-component values — allocation`,
	() => {
		registerContenders_((name, tags, run) => resourceCase(name, { tags }, run));
	},
);
