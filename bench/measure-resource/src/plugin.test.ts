import {
	conditionFrame,
	MeasureResultValidationError,
} from "@ac-bench/core/plugin";
import { getDataFrameColumnByName } from "@ac-kit/model-dataset";
import { describe, expect, it } from "vitest";

import type { ResourceBenchRunCaseResult } from "./_types.js";
import plugin from "./plugin.js";

function caseResult_(
	overrides: Partial<ResourceBenchRunCaseResult> = {},
): ResourceBenchRunCaseResult {
	return {
		name: "alloc",
		tags: {},
		statistics: {
			samples: 12,
			operations: 1200,
			cpuTimeMs: 0.002,
			allocatedBytes: 96,
			gcPauseMs: 0.001,
			gcCount: 0.01,
			heapPeakBytes: 5_000_000,
			rssPeakBytes: 40_000_000,
			heapLimitRatio: 0.1,
			gcTimeRatio: 0.05,
		},
		forcedCollection: true,
		warnings: [],
		...overrides,
	};
}

describe("resource plugin", () => {
	it("declares its scheduling requirements", () => {
		expect(plugin.scheduling).toEqual({
			rounds: "one",
			grouping: "case",
			execArgv: ["--expose-gc"],
		});
	});

	it("caseRow reports raw values, leaving formatting to the renderer", () => {
		expect(plugin.caseRow(caseResult_())).toEqual([
			"alloc",
			96,
			0.002,
			5_000_000,
			40_000_000,
			0.001,
			0.05,
			12,
			null,
		]);
	});

	it("caseRow flags a run that could not force a collection", () => {
		const row = plugin.caseRow(caseResult_({ forcedCollection: false }));

		expect(row.at(-1)).toBe("no --expose-gc");
	});

	it("caseRow reports a failure in the status field, not the case name", () => {
		const row = plugin.caseRow(
			caseResult_({ statistics: null, failure: "boom" }),
		);

		expect(row[0]).toBe(caseResult_().name);
		expect(row.at(-1)).toContain("FAILED: boom");
	});

	it("declares bytes with a unit and a direction", () => {
		const allocated = plugin.fields.find(
			(field) => field.name === "allocatedBytes",
		);

		expect(allocated).toMatchObject({
			unit: { symbol: "B", scale: 0 },
			direction: "lower-is-better",
		});
	});

	it("orders cases on bytes allocated", () => {
		expect(plugin.comparison).toEqual({ field: "allocatedBytes" });
	});

	it("surfaces a case failure as an error diagnostic", () => {
		const diagnostics = plugin.warnings(
			caseResult_({ statistics: null, failure: "boom" }),
		);

		expect(diagnostics).toEqual([
			{ severity: "error", code: "case-failed", message: "boom" },
		]);
	});

	it("a condition frame carries the same values as the case rows", () => {
		const frame = conditionFrame(plugin, {
			title: "resource",
			results: [caseResult_({ name: "a" }), caseResult_({ name: "b" })],
		});

		expect(frame.rowCount).toBe(2);
		expect(getDataFrameColumnByName(frame, "case")).toEqual(["a", "b"]);
		expect(frame.meta?.title).toBe("resource");
	});

	it("rejects a result that does not match the schema", () => {
		expect(() => plugin.caseRow({ name: "a" })).toThrow(
			MeasureResultValidationError,
		);
	});
});
