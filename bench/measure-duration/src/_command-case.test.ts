import { fileURLToPath } from "node:url";

import {
	collectForkUnits,
	drainConditions,
	MeasureData,
	runForkUnit,
} from "@ac-bench/core/runner";
import { MemorySink } from "@ac-kit/app-report";
import { beforeAll, describe, expect, it } from "vitest";

import { DurationBenchRunCaseResult } from "./_types.js";

const FIXTURE_ = fileURLToPath(
	new URL("./__fixtures__/process-cases.bench.ts", import.meta.url),
);

describe("command cases", () => {
	let results: Map<string, DurationBenchRunCaseResult>;

	beforeAll(async () => {
		await import(FIXTURE_);

		const [unit] = collectForkUnits(drainConditions());
		const sink = new MemorySink<MeasureData>();

		await runForkUnit(unit!, AbortSignal.timeout(120_000), {
			sink,
			file: FIXTURE_,
			parentScopeId: null,
		});

		results = new Map(
			sink
				.snapshot()
				.data.filter((entry) => entry.kind === "case-execution")
				.map((entry) => [
					entry.caseTitle,
					entry.result as DurationBenchRunCaseResult,
				]),
		);
	}, 120_000);

	it("measures a command case against its own do-nothing invocation", () => {
		const result = results.get("does nothing");

		expect(result?.failure).toBeUndefined();
		expect(result?.execution).toBe("command");
		expect(result?.timings).toHaveLength(3);
		expect(result?.spawnBaseline?.subtracted).toBe(true);
		expect(result?.spawnBaseline?.statistics.samples).toBe(3);
		// Nothing but start-up is being measured, so the baseline is the whole thing.
		expect(result?.spawnBaseline?.share).toBeGreaterThan(0.5);
		expect(result?.adjusted).not.toBeNull();
	});

	it("refuses to guess a baseline for a command that declared no baseline args", () => {
		const result = results.get("no baseline declared");

		expect(result?.spawnBaseline).toBeNull();
		expect(result?.warnings.map((warning) => warning.kind)).toContain(
			"no-baseline-args",
		);
	});

	// An exit code with no output is undiagnosable, and a failing program is the
	// likeliest thing to go wrong in this execution mode.
	it("reports the stderr tail of a command that exits non-zero", () => {
		const result = results.get("fails loudly");

		expect(result?.statistics).toBeNull();
		expect(result?.failure).toContain("exited with code 4");
		expect(result?.failure).toContain("could not open the thing");
	});
});
