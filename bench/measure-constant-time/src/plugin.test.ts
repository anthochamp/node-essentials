import {
	conditionFrame,
	MeasureResultValidationError,
} from "@ac-bench/core/plugin";
import { getDataFrameColumnByName } from "@ac-kit/model-dataset";
import { describe, expect, it } from "vitest";

import type { ConstantTimeCaseResult } from "./_types.js";
import plugin from "./plugin.js";

function caseResult(
	overrides: Partial<ConstantTimeCaseResult> = {},
): ConstantTimeCaseResult {
	return {
		title: "sign",
		dudectResult: {
			t: 1.2,
			degreesOfFreedom: 998,
			samplesPerClass: 10_000,
			leakDetected: false,
		},
		tags: {},
		warnings: [],
		failureMessage: null,
		...overrides,
	};
}

describe("constant-time plugin", () => {
	it("declares its scheduling requirements", () => {
		expect(plugin.scheduling).toEqual({
			rounds: "one",
			grouping: "condition",
		});
	});

	it("caseRow reports raw values, leaving formatting to the renderer", () => {
		expect(plugin.caseRow(caseResult())).toEqual([
			"sign",
			1.2,
			998,
			10_000,
			"ok",
		]);
	});

	it("caseRow renders a skipped case", () => {
		const row = plugin.caseRow(
			caseResult({ dudectResult: null, failureMessage: "boom" }),
		);
		expect(row.at(-1)).toContain("SKIPPED: boom");
	});

	it("declares a dimensionless t-statistic with no direction", () => {
		const tField = plugin.fields.find((field) => field.name === "t");

		expect(tField).toMatchObject({ unit: { symbol: "1", scale: 0 } });
		// Thresholded against a critical value, never ranked against peers.
		expect(tField).not.toHaveProperty("direction");
		expect(plugin.comparison).toBeUndefined();
	});

	it("a condition frame carries the same values as the case rows", () => {
		const frame = conditionFrame(plugin, {
			title: "constant-time",
			results: [caseResult({ title: "a" }), caseResult({ title: "b" })],
		});

		expect(frame.rowCount).toBe(2);
		expect(getDataFrameColumnByName(frame, "case")).toEqual(["a", "b"]);
		expect(frame.meta?.title).toBe("constant-time");
	});

	it("warnings surfaces a failure as an error diagnostic", () => {
		expect(
			plugin.warnings(
				caseResult({ dudectResult: null, failureMessage: "boom" }),
			),
		).toEqual([{ severity: "error", code: "case-failed", message: "boom" }]);
	});

	it("toJsonCondition round-trips a condition result", () => {
		const conditionInput = {
			title: "constant-time",
			results: [caseResult()],
		};
		const json = plugin.toJsonCondition(conditionInput) as {
			constantTimeConditions: unknown[];
		};
		expect(json.constantTimeConditions).toHaveLength(1);
	});

	it("rejects a foreign payload from a different measure's shape", () => {
		// Shaped like a duration case result, not a constant-time one.
		expect(() =>
			plugin.caseRow({ name: "a", overheadMs: 0, timings: [] }),
		).toThrow(MeasureResultValidationError);
	});
});
