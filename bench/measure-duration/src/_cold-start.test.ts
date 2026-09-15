import { fileURLToPath } from "node:url";

import {
	collectForkUnits,
	drainConditions,
	MeasureData,
	runForkUnit,
} from "@ac-bench/core/runner";
import { MemorySink } from "@ac-kit/app-report";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DurationBenchRunCaseResult } from "./_types.js";

const FIXTURE_ = fileURLToPath(
	new URL("./__fixtures__/cold-start.bench.ts", import.meta.url),
);

/**
 * `execution: "per-iteration-process"` spawns a fresh interpreter that
 * re-imports the bench file, and inherits this process's `execArgv` so the
 * spawned one can read the same sources. Under the real runner that is the
 * TypeScript loader the CLI forked the condition child with; under the test
 * runner, which transforms in-process, there is nothing to inherit — so the
 * test arranges the `execArgv` a real fork would have provided.
 */
describe("per-iteration-process execution", () => {
	const originalExecArgv = process.execArgv;
	let result: DurationBenchRunCaseResult | undefined;

	beforeAll(async () => {
		process.execArgv = ["--import", import.meta.resolve("tsx/esm")];

		await import(FIXTURE_);

		const [unit] = collectForkUnits(drainConditions());
		const sink = new MemorySink<MeasureData>();

		await runForkUnit(unit!, AbortSignal.timeout(120_000), {
			sink,
			file: FIXTURE_,
			parentScopeId: null,
		});

		const [entry] = sink
			.snapshot()
			.data.filter((data) => data.kind === "case-execution");

		result = entry?.result as DurationBenchRunCaseResult | undefined;
	}, 120_000);

	afterAll(() => {
		process.execArgv = originalExecArgv;
	});

	it("spawns one process per sample", () => {
		expect(result?.failure).toBeUndefined();
		expect(result?.execution).toBe("per-iteration-process");
		expect(result?.timings).toHaveLength(3);
		// A whole interpreter start cannot plausibly come in under a millisecond.
		expect(result?.statistics?.medianMs).toBeGreaterThan(1);
	});

	it("measures the interpreter's own start-up as the baseline", () => {
		expect(result?.spawnBaseline?.subtracted).toBe(true);
		expect(result?.spawnBaseline?.share).toBeGreaterThan(0);
		expect(result?.spawnBaseline?.share).toBeLessThan(1);
		expect(result?.adjusted).not.toBeNull();
	});

	it("breaks the cold start into start-up, import and first call", () => {
		// Loading the bench file and the measure is the bulk of this cold start;
		// the bare interpreter start it is measured against is the smaller part.
		expect(result?.coldStart?.startupMs).toBeGreaterThan(0);
		expect(result?.coldStart?.importMs).toBeGreaterThan(
			result!.coldStart!.startupMs,
		);
	});
});
