import type { MeasurementPlan } from "@ac-bench/lib";
import { z } from "zod/mini";

/**
 * What the user wants to know, not how to find it out.
 *
 * None of the measurement plan's parameters is a flag. A user asking for a
 * trustworthy comparison should not also have to know how many processes that
 * takes on their machine — the same move the sampler already makes for sample
 * counts with `relativeError: "auto"`.
 */
export const benchModeSchema = z.enum(["quick", "standard", "rigorous"]);
export type BenchMode = z.infer<typeof benchModeSchema>;

const PROFILES_: Readonly<Record<BenchMode, MeasurementPlan>> = {
	// One process, no replication: the process-level offset is unmeasured and
	// the answer is a rough one. Says so by being called `quick`.
	quick: {
		replicates: 1,
		maxReplicates: 1,
		isolatedRuns: 0,
		rounds: 1,
		cooldown: false,
		retryOnInstability: 0,
	},
	// Two processes is the cheapest plan that can see the process lottery at
	// all: with one, the only interval available is the within-process one,
	// which is exactly the number that says nothing about it. `standard` starts
	// there and buys more only for a comparison those intervals leave open.
	standard: {
		replicates: 2,
		maxReplicates: 5,
		isolatedRuns: 0,
		rounds: 16,
		cooldown: false,
		retryOnInstability: 0,
	},
	// Everything on: replicates for the process lottery, isolated runs for
	// order sensitivity, and a machine that has been made to sit still first.
	rigorous: {
		replicates: 5,
		maxReplicates: 9,
		isolatedRuns: 3,
		rounds: 16,
		cooldown: true,
		retryOnInstability: 1,
	},
};

export const DEFAULT_BENCH_MODE: BenchMode = "standard";

/**
 * Derives the measurement plan a mode stands for.
 *
 * @param mode Defaults to {@link DEFAULT_BENCH_MODE}.
 * @param overrides Mechanism the config file may pin, for a run that needs an
 *   exact plan rather than an intent.
 * @returns The plan, frozen so a later stage cannot quietly retune it.
 */
export function resolveMeasurementPlan(
	mode: BenchMode = DEFAULT_BENCH_MODE,
	overrides?: Partial<MeasurementPlan>,
): MeasurementPlan {
	const profile = PROFILES_[mode];

	return {
		replicates: overrides?.replicates ?? profile.replicates,
		maxReplicates: Math.max(
			overrides?.maxReplicates ?? profile.maxReplicates,
			overrides?.replicates ?? profile.replicates,
		),
		isolatedRuns: overrides?.isolatedRuns ?? profile.isolatedRuns,
		rounds: overrides?.rounds ?? profile.rounds,
		cooldown: overrides?.cooldown ?? profile.cooldown,
		retryOnInstability:
			overrides?.retryOnInstability ?? profile.retryOnInstability,
	};
}
