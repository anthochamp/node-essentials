import { describe, expect, it } from "vitest";

import { collectInterleavedTimings } from "./_collect.js";
import { DEFAULT_LEAK_THRESHOLD, runDudectCheck } from "./_dudect.js";

/**
 * These exercise the harness against synthetic closures with a known, coded
 * relationship, not real hardware timing — that is what a package with an
 * actual secret-dependent operation to check does with these tools, in a test
 * of its own.
 */

function busyWaitNs(nanoseconds: number): void {
	const started = process.hrtime.bigint();
	while (process.hrtime.bigint() - started < BigInt(nanoseconds)) {
		// Spin. This is the point: a fixed, CPU-bound cost to measure.
	}
}

/** Deterministic, non-cryptographic; only the shuffle order needs it. */
function fakeRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

describe("collectInterleavedTimings", () => {
	it("collects the requested number of samples per class", async () => {
		const { classA, classB } = await collectInterleavedTimings(
			() => busyWaitNs(1000),
			() => busyWaitNs(1000),
			{
				samples: 50,
				warmup: 5,
				now: process.hrtime.bigint,
				random: fakeRandom(1),
			},
		);

		expect(classA).toHaveLength(50);
		expect(classB).toHaveLength(50);
	});

	it("is reproducible for a fixed seed", async () => {
		const options = {
			samples: 30,
			warmup: 5,
			now: process.hrtime.bigint,
			random: fakeRandom(42),
		};
		const first = await collectInterleavedTimings(
			() => busyWaitNs(500),
			() => busyWaitNs(500),
			options,
		);
		const second = await collectInterleavedTimings(
			() => busyWaitNs(500),
			() => busyWaitNs(500),
			options,
		);

		expect(first.classA).toHaveLength(second.classA.length);
		expect(first.classB).toHaveLength(second.classB.length);
	});
});

describe("runDudectCheck", () => {
	it("detects an obvious, deliberately coded timing difference", async () => {
		const result = await runDudectCheck(
			() => busyWaitNs(2000),
			() => busyWaitNs(20_000),
			{
				samples: 300,
				warmup: 20,
				now: process.hrtime.bigint,
				random: fakeRandom(2),
			},
		);

		expect(result.leakDetected).toBe(true);
		expect(Math.abs(result.t)).toBeGreaterThan(DEFAULT_LEAK_THRESHOLD);
	});

	it("finds no leak between two identical closures", async () => {
		const result = await runDudectCheck(
			() => busyWaitNs(1000),
			() => busyWaitNs(1000),
			{
				samples: 2000,
				warmup: 100,
				now: process.hrtime.bigint,
				random: fakeRandom(3),
			},
		);

		expect(result.leakDetected).toBe(false);
	});

	it("reports the sample count actually collected", async () => {
		const result = await runDudectCheck(
			() => busyWaitNs(500),
			() => busyWaitNs(500),
			{
				samples: 123,
				warmup: 5,
				now: process.hrtime.bigint,
				random: fakeRandom(4),
			},
		);

		expect(result.samplesPerClass).toBe(123);
	});
});
