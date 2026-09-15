import {
	conditionFrame,
	MeasureResultValidationError,
} from "@ac-bench/core/plugin";
import {
	dataFrameFromRows,
	getDataFrameColumnByName,
} from "@ac-kit/model-dataset";
import { describe, expect, it } from "vitest";

import type { DurationBenchRunCaseResult } from "./_types.js";
import plugin from "./plugin.js";

function caseResult(
	overrides: Partial<DurationBenchRunCaseResult> = {},
): DurationBenchRunCaseResult {
	return {
		name: "fast",
		tags: {},
		statistics: {
			samples: 10,
			meanMs: 1,
			stdDevMs: 0.1,
			confidence95Ms: 0.05,
			relativeStdDev: 0.1,
			relativeMad: 0.02,
			medianMs: 1,
			medianConfidence95Ms: 0.04,
			madMs: 0.02,
			minMs: 0.9,
			maxMs: 1.1,
			p95Ms: 1.05,
			p99Ms: 1.09,
			opsPerSecond: 1000,
			outlierIndices: [],
		},
		adjusted: null,
		overheadMs: 0,
		timings: [0.9, 1, 1.1],
		sampling: null,
		harnessOverhead: null,
		execution: "in-process",
		spawnBaseline: null,
		coldStart: null,
		estimate: null,
		contamination: null,
		warnings: [],
		...overrides,
	};
}

describe("duration plugin", () => {
	it("declares its scheduling requirements", () => {
		expect(plugin.scheduling).toEqual({
			rounds: "many",
			grouping: "case",
		});
	});

	it("warnings surfaces a sampling target the run never reached", () => {
		expect(
			plugin.warnings(
				caseResult({
					warnings: [
						{ kind: "target-not-reached", message: "short of the target" },
					],
				}),
			),
		).toContainEqual(
			expect.objectContaining({
				severity: "warning",
				code: "target-not-reached",
			}),
		);
	});

	it("caseRow keeps the case name when the case failed", () => {
		const row = plugin.caseRow(
			caseResult({ statistics: null, failure: "boom" }),
		);
		expect(row[0]).toBe("fast");
		expect(row.slice(1).every((value) => value === null)).toBe(true);
	});

	it("declares the field it orders cases on, with its interval bounds", () => {
		expect(plugin.comparison).toEqual({
			field: "medianMs",
			interval: "medianMarginMs",
			ratioField: "ratio",
		});
	});

	it("declares a unit and a direction for every measured quantity", () => {
		const median = plugin.fields.find((field) => field.name === "medianMs");
		const throughput = plugin.fields.find(
			(field) => field.name === "opsPerSecond",
		);

		expect(median).toMatchObject({
			unit: { symbol: "s", scale: -3 },
			direction: "lower-is-better",
		});
		expect(throughput).toMatchObject({
			unit: { symbol: "op/s", scale: 0 },
			direction: "higher-is-better",
		});
	});

	it("a condition frame carries one row per case and the case rows' own values", () => {
		const frame = conditionFrame(plugin, {
			title: "duration",
			results: [caseResult({ name: "a" }), caseResult({ name: "b" })],
		});

		expect(frame.rowCount).toBe(2);
		expect(getDataFrameColumnByName(frame, "case")).toEqual(["a", "b"]);
		expect(getDataFrameColumnByName(frame, "medianMs")).toEqual([1, 1]);
	});

	it("derives a ratio-to-fastest the case rows cannot carry", () => {
		const frame = conditionFrame(plugin, {
			title: "duration",
			results: [
				caseResult({ name: "a" }),
				caseResult({
					name: "b",
					statistics: { ...caseResult().statistics!, medianMs: 2, meanMs: 2 },
				}),
			],
		});

		expect(frame.fields.at(-2)?.name).toBe("ratio");
		expect(getDataFrameColumnByName(frame, "ratio")[0]).toBe(1);
		expect(getDataFrameColumnByName(frame, "ratio")[1]).toBeCloseTo(2, 5);
	});

	// The live table holds rows for cases that have not reported yet; the ratio
	// must still be computed from the ones that have.
	it("derives the ratio over a frame whose rows are not all filled in", () => {
		const partial = dataFrameFromRows(plugin.fields, [
			plugin.caseRow(caseResult({ name: "a" })),
			["b", ...Array<null>(plugin.fields.length - 1).fill(null)],
		]);

		const frame = plugin.deriveFields(partial);
		expect(getDataFrameColumnByName(frame, "ratio")).toEqual([1, null]);
	});

	it("warnings surfaces a failure as an error diagnostic", () => {
		expect(
			plugin.warnings(caseResult({ statistics: null, failure: "boom" })),
		).toEqual([{ severity: "error", code: "case-failed", message: "boom" }]);
	});

	it("toJsonCondition round-trips a condition result", () => {
		const conditionInput = {
			title: "duration",
			results: [caseResult()],
		};
		const json = plugin.toJsonCondition(conditionInput) as {
			conditions: unknown[];
		};
		expect(json.conditions).toHaveLength(1);
	});

	it("rejects a foreign payload from a different measure's shape", () => {
		// Shaped like a jitter case result, not a duration one.
		expect(() =>
			plugin.caseRow({ name: "a", tags: {}, periodMs: 10, samples: [] }),
		).toThrow(MeasureResultValidationError);
	});
});
