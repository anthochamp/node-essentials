import {
	conditionFrame,
	MeasureResultValidationError,
} from "@ac-bench/core/plugin";
import { getDataFrameColumnByName } from "@ac-kit/model-dataset";
import { describe, expect, it } from "vitest";

import type { JitterBenchRunCaseResult } from "./_types.js";
import plugin from "./plugin.js";

function caseResult(
	overrides: Partial<JitterBenchRunCaseResult> = {},
): JitterBenchRunCaseResult {
	return {
		name: "timer",
		tags: {},
		periodMs: 10,
		statistics: {
			samples: 50,
			meanMs: 0.5,
			medianMs: 0.4,
			minMs: 0,
			maxMs: 2,
			meanAbsoluteMs: 0.5,
			p90Ms: 1,
			p99Ms: 1.5,
			driftMsPerSecond: 0.01,
			overruns: 0,
		},
		samples: [0.1, 0.2, 0.3],
		warnings: [],
		...overrides,
	};
}

describe("jitter plugin", () => {
	it("declares its scheduling requirements", () => {
		expect(plugin.scheduling).toEqual({
			rounds: "one",
			grouping: "condition",
		});
	});

	it("caseRow reports raw values, leaving formatting to the renderer", () => {
		expect(plugin.caseRow(caseResult())).toEqual([
			"timer",
			0.4,
			1.5,
			2,
			0.5,
			0.01,
			0,
			50,
			null,
		]);
	});

	it("caseRow reports a failure in the status field, not the case name", () => {
		const row = plugin.caseRow(
			caseResult({ statistics: null, failure: "boom" }),
		);
		expect(row[0]).toBe(caseResult().name);
		expect(row.at(-1)).toContain("FAILED: boom");
	});

	it("declares lateness with a unit and a direction", () => {
		const median = plugin.fields.find((field) => field.name === "medianMs");

		expect(median).toMatchObject({
			unit: { symbol: "s", scale: -3 },
			direction: "lower-is-better",
		});
	});

	it("orders cases on lateness, with no interval to escalate on", () => {
		expect(plugin.comparison).toEqual({ field: "medianMs" });
	});

	it("a condition frame carries the same values as the case rows", () => {
		const frame = conditionFrame(plugin, {
			title: "jitter",
			results: [caseResult({ name: "a" }), caseResult({ name: "b" })],
		});

		expect(frame.rowCount).toBe(2);
		expect(getDataFrameColumnByName(frame, "case")).toEqual(["a", "b"]);
		expect(frame.meta?.title).toBe("jitter");
	});

	it("warnings surfaces a failure as an error diagnostic", () => {
		expect(
			plugin.warnings(caseResult({ statistics: null, failure: "boom" })),
		).toEqual([{ severity: "error", code: "case-failed", message: "boom" }]);
	});

	it("toJsonCondition round-trips a condition result", () => {
		const conditionInput = {
			title: "jitter",
			results: [caseResult()],
		};
		const json = plugin.toJsonCondition(conditionInput) as {
			latencyConditions: unknown[];
		};
		expect(json.latencyConditions).toHaveLength(1);
	});

	it("rejects a foreign payload from a different measure's shape", () => {
		// Shaped like a duration case result, not a jitter one.
		expect(() =>
			plugin.caseRow({ name: "a", tags: {}, overheadMs: 0, timings: [] }),
		).toThrow(MeasureResultValidationError);
	});
});
