import { describe, expect, it } from "vitest";

import { Sampler, SamplingBounds } from "./sampler.js";
import { createStabilityPolicy } from "./stability-policy.js";

const BOUNDS_: SamplingBounds = {
	minRuns: 1,
	maxRuns: 100,
	minTimeMs: 0,
	maxTimeMs: 10_000,
};

/** Drives a case from a scripted sequence, with no clock and no fake timers. */
function run_(
	policy: ReturnType<typeof createStabilityPolicy<number>>,
	nextSample: (index: number) => number,
	bounds: Partial<SamplingBounds> = {},
) {
	const sampler = new Sampler(policy, {
		bounds: { ...BOUNDS_, ...bounds },
		costOf: () => 1,
	});

	let index = 0;

	for (
		let size = sampler.nextBatch();
		size !== null;
		size = sampler.nextBatch()
	) {
		const batch = Array.from({ length: size }, () => nextSample(index++));
		sampler.observe(batch, batch.length);
	}

	return sampler.result();
}

describe("createStabilityPolicy", () => {
	it("should stop once the counter has repeated across the window", () => {
		const result = run_(
			createStabilityPolicy((value: number) => [value]),
			() => 42,
		);

		expect(result.stopReason).toBe("policy-satisfied");
		expect(result.metadata.stable).toBe(true);
		expect(result.metadata.stableSamples).toBe(3);
	});

	it("should keep sampling while the counter still moves", () => {
		const result = run_(
			createStabilityPolicy((value: number) => [value]),
			(index) => index,
		);

		expect(result.stopReason).toBe("max-runs");
		expect(result.metadata.stable).toBe(false);
	});

	it("should require every watched quantity to settle", () => {
		// The first entry is settled from the start; the second never is.
		const result = run_(
			createStabilityPolicy((value: number) => [7, value]),
			(index) => index,
		);

		expect(result.stopReason).toBe("max-runs");
		expect(result.metadata.stable).toBe(false);
	});

	it("should reject a spread wider than the tolerance", () => {
		const result = run_(
			createStabilityPolicy((value: number) => [value], { tolerance: 0.01 }),
			(index) => (index % 2 === 0 ? 100 : 130),
		);

		expect(result.stopReason).toBe("max-runs");
		expect(result.metadata.stable).toBe(false);
	});

	it("should accept a spread inside the tolerance, which exact equality would reject", () => {
		const nearlyEqual = (index: number) => (index % 2 === 0 ? 1000 : 1001);

		expect(
			run_(
				createStabilityPolicy((value: number) => [value]),
				nearlyEqual,
			).metadata.stable,
		).toBe(false);

		expect(
			run_(
				createStabilityPolicy((value: number) => [value], { tolerance: 0.01 }),
				nearlyEqual,
			).metadata.stable,
		).toBe(true);
	});

	it("should honour a wider window", () => {
		const policy = createStabilityPolicy((value: number) => [value], {
			window: 5,
		});

		// Settles only from the sixth sample on, so a window of 3 would have
		// stopped while a window of 5 cannot.
		const result = run_(policy, (index) => (index < 5 ? index : 99));

		expect(result.metadata.requiredStableSamples).toBe(5);
		expect(result.metadata.stable).toBe(true);
		expect(result.samples.length).toBeGreaterThanOrEqual(10);
	});

	it("should report how far it got when it never settles", () => {
		// Pairs: the trailing two always agree, three never do.
		const result = run_(
			createStabilityPolicy((value: number) => [value]),
			(index) => Math.floor(index / 2),
			{ maxRuns: 10 },
		);

		expect(result.stopReason).toBe("max-runs");
		expect(result.metadata.stable).toBe(false);
		expect(result.metadata.stableSamples).toBe(2);
	});
});
