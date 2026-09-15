import { BenchCaseRunContext } from "@ac-bench/core/runner";
import { describe, expect, it } from "vitest";

import { runResourceCase } from "./_run-case.js";
import { ResourceBenchRunCaseResult } from "./_types.js";
import { ResourceConditionOptions } from "./options.js";

/** Keeps every batch small, so a sanity check does not run for ten seconds. */
const FAST_: ResourceConditionOptions = {
	sampling: {
		warmup: 1,
		minRuns: 5,
		maxRuns: 40,
		minTimeMs: 0,
		maxTimeMs: 2000,
		relativeError: "off",
	},
};

async function run_(
	fn: (signal: AbortSignal) => void,
	options: ResourceConditionOptions = FAST_,
): Promise<ResourceBenchRunCaseResult> {
	let result: ResourceBenchRunCaseResult | null = null;

	const context = {
		signal: AbortSignal.timeout(30_000),
		measureOptions: {},
		caseId: { measure: "resource", path: [0], title: "case" },
		round: () => Promise.resolve(),
		progress: () => {},
		attach: () => {},
		setCaseResult: (value: unknown) => {
			result = value as ResourceBenchRunCaseResult;
		},
		setConditionResult: () => {},
	} as unknown as BenchCaseRunContext;

	await runResourceCase("case", fn, context, { conditionOptions: options });

	expect(result).not.toBeNull();
	return result as unknown as ResourceBenchRunCaseResult;
}

/** Held outside the case so the allocation cannot be optimised away. */
// oxlint-disable-next-line no-unused-vars
let sink_: unknown;

describe("runResourceCase", () => {
	it("should attribute a known allocation to the case that made it", async () => {
		const ELEMENTS = 4096;

		const result = await run_(() => {
			sink_ = new Float64Array(ELEMENTS);
		});

		expect(result.failure).toBeUndefined();
		expect(result.statistics).not.toBeNull();

		// 8 bytes per element plus object overhead, and the counters resolve to
		// whole pages rather than bytes — so the claim is the magnitude, which is
		// what distinguishes this from a case that allocates nothing.
		expect(result.statistics!.allocatedBytes).toBeGreaterThan(
			ELEMENTS * 8 * 0.5,
		);
	});

	it("should report far less for a case that allocates nothing", async () => {
		let total = 0;

		const allocating = await run_(() => {
			sink_ = new Float64Array(4096);
		});
		const bare = await run_(() => {
			total += 1;
		});

		expect(total).toBeGreaterThan(0);
		expect(bare.statistics!.allocatedBytes).toBeLessThan(
			allocating.statistics!.allocatedBytes / 10,
		);
	});

	it("should record whether a forced collection was available", async () => {
		const result = await run_(() => {
			sink_ = null;
		});

		expect(result.forcedCollection).toBe(typeof globalThis.gc === "function");
	});

	it("should report a throwing case as a failure rather than a summary", async () => {
		const result = await run_(() => {
			throw new Error("boom");
		});

		expect(result.statistics).toBeNull();
		expect(result.failure).toContain("boom");
	});

	it("should run every batch it was asked for", async () => {
		let calls = 0;

		const result = await run_(() => {
			calls += 1;
		});

		expect(result.statistics!.operations).toBeGreaterThan(0);
		expect(calls).toBeGreaterThanOrEqual(result.statistics!.operations);
	});
});
