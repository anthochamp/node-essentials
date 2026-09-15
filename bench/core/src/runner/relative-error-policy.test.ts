import { defaults } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import {
	createRelativeErrorPolicy,
	RelativeErrorOptions,
} from "./relative-error-policy.js";
import { Sampler, SamplingBounds } from "./sampler.js";

type Sampling = SamplingBounds & RelativeErrorOptions;

const SAMPLING_DEFAULTS: Sampling = {
	minRuns: 10,
	maxRuns: 100_000,
	minTimeMs: 250,
	maxTimeMs: 10_000,
	relativeError: "auto",
	confidenceLevel: 0.95,
	estimator: "median",
};

function samplingBounds_(sampling: Sampling): SamplingBounds {
	return {
		minRuns: sampling.minRuns,
		maxRuns: sampling.maxRuns,
		minTimeMs: sampling.minTimeMs,
		maxTimeMs: sampling.maxTimeMs,
	};
}

/**
 * Drives a whole case from a scripted sequence of sample durations, with no
 * clock and no fake timers: `activeMs` is simply the sum of what was scripted.
 */
function run_(sampling: Sampling, nextSample: (index: number) => number) {
	const sampler = new Sampler(createRelativeErrorPolicy(sampling), {
		bounds: samplingBounds_(sampling),
		costOf: (ms) => ms,
	});

	let index = 0;

	for (
		let size = sampler.nextBatch();
		size !== null;
		size = sampler.nextBatch()
	) {
		const batch = Array.from({ length: size }, () => nextSample(index++));
		sampler.observe(
			batch,
			batch.reduce((total, ms) => total + ms, 0),
		);
	}

	return sampler.result();
}

/** Deterministic pseudo-noise, so a "noisy" script stays reproducible. */
function noisy_(median: number, spread: number): (index: number) => number {
	return (index) => {
		const phase = Math.sin(index * 12.9898) * 43_758.545_312;

		return median + (phase - Math.floor(phase) - 0.5) * 2 * spread;
	};
}

describe("createRelativeErrorPolicy", () => {
	it("should stop shortly after the floors on a constant workload", () => {
		const sampling = defaults<Sampling>(
			{
				relativeError: 0.01,
				minTimeMs: 0,
			},
			SAMPLING_DEFAULTS,
		);

		const result = run_(sampling, () => 1);

		expect(result.stopReason).toBe("policy-satisfied");
		expect(result.samples.length).toBeGreaterThanOrEqual(sampling.minRuns);
		expect(result.metadata.achievedRelativeError).toBeLessThanOrEqual(0.01);
		expect(result.metadata.targetReached).toBe(true);
	});

	it("should reproduce the fixed-bound loop when the target is off", () => {
		const sampling = defaults<Sampling>(
			{
				relativeError: "off",
				minRuns: 25,
				minTimeMs: 0,
			},
			SAMPLING_DEFAULTS,
		);

		const result = run_(sampling, noisy_(1, 0.5));

		expect(result.stopReason).toBe("min-time");
		expect(result.samples).toHaveLength(25);
		expect(result.metadata.effectiveRelativeErrorTarget).toBeNull();
		expect(result.metadata.targetReached).toBe(false);
	});

	it("should stop on a bound when the noise makes the target unreachable", () => {
		const sampling = defaults<Sampling>(
			{
				relativeError: 0.000_01,
				maxRuns: 200,
				minTimeMs: 0,
			},
			SAMPLING_DEFAULTS,
		);

		const result = run_(sampling, noisy_(1, 0.9));

		expect(result.stopReason).toBe("max-runs");
		expect(result.metadata.targetReached).toBe(false);
		expect(result.metadata.achievedRelativeError).not.toBeNull();
	});

	it("should reach maxTimeMs on a slow operation without claiming the target", () => {
		const sampling = defaults<Sampling>(
			{
				relativeError: 0.001,
				minRuns: 1,
				minTimeMs: 0,
				maxTimeMs: 1000,
			},
			SAMPLING_DEFAULTS,
		);

		const result = run_(sampling, noisy_(300, 60));

		expect(result.stopReason).toBe("max-time");
		expect(result.metadata.targetReached).toBe(false);
	});

	it("should claim nothing below eight samples", () => {
		const sampling = defaults<Sampling>(
			{
				relativeError: 0.5,
				minRuns: 5,
				maxRuns: 5,
				minTimeMs: 0,
			},
			SAMPLING_DEFAULTS,
		);

		const result = run_(sampling, () => 1);

		expect(result.samples).toHaveLength(5);
		expect(result.metadata.achievedRelativeError).toBeNull();
		expect(result.metadata.targetReached).toBe(false);
	});

	it("should derive an auto target inside its clamp, deterministically", () => {
		const sampling = defaults<Sampling>(
			{
				relativeError: "auto",
				minTimeMs: 0,
				maxRuns: 400,
			},
			SAMPLING_DEFAULTS,
		);

		const first = run_(sampling, noisy_(1, 0.2));
		const second = run_(sampling, noisy_(1, 0.2));

		const target = first.metadata.effectiveRelativeErrorTarget;

		expect(target).not.toBeNull();
		expect(target).toBeGreaterThanOrEqual(0.005);
		expect(target).toBeLessThanOrEqual(0.05);
		expect(second.metadata.effectiveRelativeErrorTarget).toBe(target);
	});

	it("should need materially more samples for the mean than the median on a heavy tail", () => {
		// One sample in twenty is a hundred times the rest: a GC pause, in effect.
		const heavyTailed = (index: number) => (index % 20 === 0 ? 100 : 1);

		const median = run_(
			defaults<Sampling>(
				{
					relativeError: 0.05,
					estimator: "median",
					minTimeMs: 0,
					maxRuns: 20_000,
				},
				SAMPLING_DEFAULTS,
			),
			heavyTailed,
		);
		const mean = run_(
			defaults<Sampling>(
				{
					relativeError: 0.05,
					estimator: "mean",
					minTimeMs: 0,
					maxRuns: 20_000,
				},
				SAMPLING_DEFAULTS,
			),
			heavyTailed,
		);

		expect(median.metadata.targetReached).toBe(true);
		expect(mean.samples.length).toBeGreaterThan(median.samples.length);
	});

	it("should report the requested target verbatim", () => {
		const result = run_(
			defaults<Sampling>(
				{ relativeError: 0.02, minTimeMs: 0 },
				SAMPLING_DEFAULTS,
			),
			() => 1,
		);

		expect(result.metadata).toMatchObject({
			requestedRelativeError: 0.02,
			confidenceLevel: 0.95,
			estimator: "median",
		});
	});
});
