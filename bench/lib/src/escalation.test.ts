import type { MeasureComparison } from "@ac-bench/core/plugin";
import type { DataFrame } from "@ac-kit/model-dataset";
import { dataFrameFromRows } from "@ac-kit/model-dataset";
import { describe, expect, it } from "vitest";

import { comparisonUnresolved } from "./escalation.js";

const COMPARISON: MeasureComparison = {
	field: "value",
	interval: ["lower", "upper"],
};

/** Cases as `[value, uncertainty?]`; an absent uncertainty leaves no interval. */
function conditionFrame(
	cases: readonly [value: number, uncertainty?: number][],
): DataFrame {
	return dataFrameFromRows(
		[
			{ name: "value", kind: "quantitative" },
			{ name: "lower", kind: "quantitative" },
			{ name: "upper", kind: "quantitative" },
		],
		cases.map(([value, uncertainty]) =>
			uncertainty === undefined
				? [value, null, null]
				: [value, value - uncertainty, value + uncertainty],
		),
	);
}

describe("comparisonUnresolved", () => {
	it("settles a comparison whose intervals are apart", () => {
		expect(
			comparisonUnresolved(
				conditionFrame([
					[1, 0.1],
					[2, 0.1],
				]),
				COMPARISON,
			),
		).toBe(false);
	});

	// Whichever came out ahead did so within the noise, and another process
	// could reverse it.
	it("leaves a comparison unsettled when intervals overlap", () => {
		expect(
			comparisonUnresolved(
				conditionFrame([
					[1, 0.6],
					[2, 0.6],
				]),
				COMPARISON,
			),
		).toBe(true);
	});

	it("treats touching intervals as unsettled", () => {
		expect(
			comparisonUnresolved(
				conditionFrame([
					[1, 0.5],
					[2, 0.5],
				]),
				COMPARISON,
			),
		).toBe(true);
	});

	it("checks every pair, not only the extremes", () => {
		expect(
			comparisonUnresolved(
				conditionFrame([
					[1, 0.05],
					[2, 0.6],
					[3, 0.6],
					[9, 0.05],
				]),
				COMPARISON,
			),
		).toBe(true);
	});

	// An unknown interval is not an overlapping one; treating it as such would
	// escalate for ever on a measure that reports no uncertainty at all.
	it("ignores cases with no interval", () => {
		expect(comparisonUnresolved(conditionFrame([[1], [1]]), COMPARISON)).toBe(
			false,
		);
	});

	it("settles trivially with fewer than two comparable cases", () => {
		expect(comparisonUnresolved(conditionFrame([[1, 5]]), COMPARISON)).toBe(
			false,
		);
		expect(comparisonUnresolved(conditionFrame([]), COMPARISON)).toBe(false);
	});

	// A measure reporting a point estimate makes no claim tight enough to spend
	// more machine time on.
	it("settles when the measure declares no interval bounds", () => {
		const frame = conditionFrame([
			[1, 0.6],
			[2, 0.6],
		]);
		expect(comparisonUnresolved(frame, { field: "value" })).toBe(false);
		expect(comparisonUnresolved(frame, undefined)).toBe(false);
	});

	it("settles when a declared bound field is absent from the frame", () => {
		expect(
			comparisonUnresolved(conditionFrame([[1, 0.6]]), {
				field: "value",
				interval: ["nope", "upper"],
			}),
		).toBe(false);
	});
});
