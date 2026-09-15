import { describe, expect, it } from "vitest";

import {
	Sampler,
	SamplingBounds,
	StoppingDecision,
	StoppingPolicy,
} from "./sampler.js";

const BOUNDS: SamplingBounds = {
	minRuns: 10,
	maxRuns: 1000,
	minTimeMs: 0,
	maxTimeMs: 10_000,
};

/** Never satisfied: the bounds are the only thing that can stop it. */
function neverSatisfied_(pilotSamples = 10): StoppingPolicy<number, null> {
	return {
		pilotSamples,
		evaluate: () => ({ kind: "continue" }),
		describe: () => null,
	};
}

/** Satisfied on the nth consultation, so the driver's ordering is observable. */
function satisfiedOnCall_(
	call: number,
	pilotSamples = 10,
): StoppingPolicy<number, number> & { calls: number } {
	const policy = {
		calls: 0,
		pilotSamples,
		evaluate: (): StoppingDecision => {
			policy.calls += 1;
			return policy.calls >= call
				? { kind: "satisfied" }
				: { kind: "continue" };
		},
		describe: () => policy.calls,
	};

	return policy;
}

/**
 * Drives a sampler to completion against a scripted per-sample duration.
 *
 * @returns The result, plus the batch sizes it asked for.
 */
function drive_<TMetadata>(
	sampler: Sampler<number, TMetadata>,
	sampleMs: number,
	activeMsPerSample = sampleMs,
): { batchSizes: number[] } {
	const batchSizes: number[] = [];

	for (
		let size = sampler.nextBatch();
		size !== null;
		size = sampler.nextBatch()
	) {
		batchSizes.push(size);
		sampler.observe(
			Array<number>(size).fill(sampleMs),
			size * activeMsPerSample,
		);
	}

	return { batchSizes };
}

describe("Sampler", () => {
	it("should take the policy's pilot before consulting it", () => {
		const policy = satisfiedOnCall_(1, 20);
		const sampler = new Sampler(policy, { bounds: BOUNDS, costOf: (ms) => ms });

		expect(sampler.nextBatch()).toBe(20);
		expect(policy.calls).toBe(0);
	});

	it("should stop on the batch its policy is satisfied at", () => {
		const policy = satisfiedOnCall_(3);
		const sampler = new Sampler(policy, { bounds: BOUNDS, costOf: (ms) => ms });

		drive_(sampler, 1);

		expect(sampler.result().stopReason).toBe("policy-satisfied");
		expect(policy.calls).toBe(3);
	});

	it("should honour the reason a policy names", () => {
		const sampler = new Sampler(
			{
				pilotSamples: 10,
				evaluate: () => ({ kind: "satisfied", reason: "min-time" }),
				describe: () => null,
			},
			{ bounds: BOUNDS, costOf: (ms) => ms },
		);

		drive_(sampler, 1);

		expect(sampler.result().stopReason).toBe("min-time");
	});

	it("should respect maxRuns", () => {
		const sampler = new Sampler(neverSatisfied_(), {
			bounds: { ...BOUNDS, maxRuns: 37 },
			costOf: (ms) => ms,
		});

		drive_(sampler, 0.001);

		const result = sampler.result();

		expect(result.samples).toHaveLength(37);
		expect(result.stopReason).toBe("max-runs");
	});

	it("should respect maxTimeMs against activeMs, not against the samples", () => {
		const sampler = new Sampler(neverSatisfied_(), {
			bounds: { ...BOUNDS, maxTimeMs: 100 },
			costOf: (ms) => ms,
		});

		// Ten times more wall time than measured time, as interleaving produces.
		drive_(sampler, 1, 10);

		const result = sampler.result();

		expect(result.stopReason).toBe("max-time");
		expect(result.activeMs).toBeGreaterThanOrEqual(100);
	});

	it("should not consult the policy before the floors are met", () => {
		const policy = satisfiedOnCall_(1, 5);
		const sampler = new Sampler(policy, {
			bounds: { ...BOUNDS, minRuns: 40 },
			costOf: (ms) => ms,
		});

		drive_(sampler, 1);

		expect(sampler.result().samples.length).toBeGreaterThanOrEqual(40);
	});

	it("should not consult the policy before minTimeMs is reached", () => {
		const sampler = new Sampler(satisfiedOnCall_(1, 5), {
			bounds: { ...BOUNDS, minRuns: 1, minTimeMs: 50 },
			costOf: (ms) => ms,
		});

		drive_(sampler, 1);

		expect(sampler.result().activeMs).toBeGreaterThanOrEqual(50);
	});

	it("should size a batch at roughly the target measured work", () => {
		const sampler = new Sampler(neverSatisfied_(), {
			bounds: BOUNDS,
			costOf: (ms) => ms,
			targetBatchMs: 5,
		});

		const { batchSizes } = drive_(sampler, 0.125);

		// 0.125 ms per sample means 40 per 5 ms batch.
		expect(batchSizes[1]).toBe(40);
	});

	it("should clamp a policy's suggestion against the remaining bounds", () => {
		const sampler = new Sampler(
			{
				pilotSamples: 10,
				evaluate: () => ({ kind: "continue", suggestedSamples: 10_000 }),
				describe: () => null,
			},
			{ bounds: { ...BOUNDS, maxRuns: 25 }, costOf: (ms) => ms },
		);

		const { batchSizes } = drive_(sampler, 1);

		expect(batchSizes).toEqual([10, 15]);
		expect(sampler.result().samples).toHaveLength(25);
	});

	it("should stop as cancelled when its signal is already aborted", () => {
		const sampler = new Sampler(neverSatisfied_(), {
			bounds: BOUNDS,
			signal: AbortSignal.abort(),
			costOf: (ms) => ms,
		});

		expect(sampler.nextBatch()).toBeNull();
		expect(sampler.result().stopReason).toBe("cancelled");
	});

	it("should keep the samples collected before a failure", () => {
		const sampler = new Sampler(neverSatisfied_(), {
			bounds: BOUNDS,
			costOf: (ms) => ms,
		});

		sampler.observe([1, 2, 3], 3);
		sampler.stop("failure");

		const result = sampler.result();

		expect(result.stopReason).toBe("failure");
		expect(result.samples).toEqual([1, 2, 3]);
		expect(sampler.nextBatch()).toBeNull();
	});

	it("should carry the policy's metadata into the result", () => {
		const sampler = new Sampler(satisfiedOnCall_(2), {
			bounds: BOUNDS,
			costOf: (ms) => ms,
		});

		drive_(sampler, 1);

		expect(sampler.result().metadata).toBe(2);
	});

	it("should be behaviour-neutral between one batch at a time and a tight loop", () => {
		const tight = new Sampler(satisfiedOnCall_(4), {
			bounds: BOUNDS,
			costOf: (ms) => ms,
		});
		drive_(tight, 0.5);

		const resumed = new Sampler(satisfiedOnCall_(4), {
			bounds: BOUNDS,
			costOf: (ms) => ms,
		});
		let size = resumed.nextBatch();
		while (size !== null) {
			resumed.observe(Array<number>(size).fill(0.5), size * 0.5);
			size = resumed.nextBatch();
		}

		expect(resumed.result()).toEqual(tight.result());
	});

	it("should need no clock of its own", () => {
		const sampler = new Sampler(neverSatisfied_(), {
			bounds: { ...BOUNDS, maxTimeMs: 20 },
			costOf: (ms) => ms,
		});

		// Every duration below is an input; nothing here advances a real clock.
		sampler.observe([1, 1, 1], 12);
		expect(sampler.nextBatch()).not.toBeNull();

		sampler.observe([1, 1, 1], 12);
		expect(sampler.nextBatch()).toBeNull();
		expect(sampler.result().stopReason).toBe("max-time");
	});
});
