import { describe, expect, it } from "vitest";

import { DEFAULT_BENCH_MODE, resolveMeasurementPlan } from "./mode.js";

describe("resolveMeasurementPlan", () => {
	it("defaults to standard", () => {
		expect(DEFAULT_BENCH_MODE).toBe("standard");
		expect(resolveMeasurementPlan()).toEqual(
			resolveMeasurementPlan(DEFAULT_BENCH_MODE),
		);
	});

	// The point of `quick` is that it makes no claim about the process lottery.
	it("gives quick a single process and no isolated arm", () => {
		const plan = resolveMeasurementPlan("quick");

		expect(plan.replicates).toBe(1);
		expect(plan.isolatedRuns).toBe(0);
		expect(plan.cooldown).toBe(false);
		expect(plan.retryOnInstability).toBe(0);
	});

	it("escalates rigour monotonically across the modes", () => {
		const quick = resolveMeasurementPlan("quick");
		const standard = resolveMeasurementPlan("standard");
		const rigorous = resolveMeasurementPlan("rigorous");

		expect(standard.replicates).toBeGreaterThanOrEqual(quick.replicates);
		expect(rigorous.replicates).toBeGreaterThan(standard.replicates);
		expect(rigorous.isolatedRuns).toBeGreaterThan(standard.isolatedRuns);
	});

	it("turns cooldown and retries on only for rigorous", () => {
		expect(resolveMeasurementPlan("rigorous").cooldown).toBe(true);
		expect(resolveMeasurementPlan("rigorous").retryOnInstability).toBe(1);
		expect(resolveMeasurementPlan("standard").cooldown).toBe(false);
	});

	it("lets a config pin one parameter without discarding the rest", () => {
		const plan = resolveMeasurementPlan("quick", { replicates: 9 });

		expect(plan.replicates).toBe(9);
		expect(plan.isolatedRuns).toBe(0);
		expect(plan.rounds).toBe(resolveMeasurementPlan("quick").rounds);
	});

	// An options bag built by spreading conditionals carries explicit
	// `undefined`s, which must not erase the profile they are merged into.
	it("ignores an override that is present but undefined", () => {
		const plan = resolveMeasurementPlan("rigorous", {
			replicates: undefined,
		});

		expect(plan.replicates).toBe(resolveMeasurementPlan("rigorous").replicates);
	});
});
