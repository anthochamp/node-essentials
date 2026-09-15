import type { DataFrame, FieldDescriptor, Value } from "@ac-kit/model-dataset";
import { dataFrameFromRows } from "@ac-kit/model-dataset";
import { expect, suite, test } from "vitest";

import { ratioRowColors } from "./row-colors.js";

const FIELDS: FieldDescriptor[] = [
	{ name: "case", kind: "nominal" },
	{ name: "ratio", kind: "quantitative", direction: "lower-is-better" },
];

function frame_(ratios: readonly (number | null)[]): DataFrame {
	const rows: Value[][] = ratios.map((ratio, index) => [`c${index}`, ratio]);
	return dataFrameFromRows(FIELDS, rows);
}

/** Perceived lightness is not what is being asserted; the hue ordering is. */
function isRedderThan_(
	a: { r8: number; g8: number; b8: number },
	b: { r8: number; g8: number; b8: number },
): boolean {
	return a.r8 - a.g8 > b.r8 - b.g8;
}

suite("ratioRowColors", () => {
	test("anchors the ramp at a ratio of one", () => {
		const colors = ratioRowColors(frame_([1, 2, 4]), "ratio");
		expect(colors).toHaveLength(3);
		expect(isRedderThan_(colors[1]!, colors[0]!)).toBe(true);
		expect(isRedderThan_(colors[2]!, colors[1]!)).toBe(true);
	});

	test("maps the value rather than the rank", () => {
		// Three rows almost at the anchor and one far from it: the near three must
		// stay close together instead of being spread across the whole ramp.
		const colors = ratioRowColors(frame_([1, 1.01, 1.02, 10]), "ratio");
		const spread = Math.abs(colors[2]!.r8 - colors[0]!.r8);
		const gap = Math.abs(colors[3]!.r8 - colors[2]!.r8);
		expect(spread).toBeLessThan(gap);
	});

	test("treats equal departures either side of the anchor alike", () => {
		const [half, double] = ratioRowColors(frame_([0.5, 2]), "ratio");
		expect(half).toEqual(double);
	});

	test("colours nothing when every row sits at the anchor", () => {
		expect(ratioRowColors(frame_([1, 1, 1]), "ratio")).toEqual([
			null,
			null,
			null,
		]);
	});

	test("colours nothing for a single row, which has no domain", () => {
		expect(ratioRowColors(frame_([1]), "ratio")).toEqual([null]);
	});

	test("leaves a row with no ratio yet uncoloured", () => {
		const colors = ratioRowColors(frame_([1, null, 4]), "ratio");
		expect(colors[1]).toBeNull();
		expect(colors[0]).not.toBeNull();
	});

	test("ignores a value a ratio cannot take", () => {
		expect(ratioRowColors(frame_([1, 0, -2, 4]), "ratio").slice(1, 3)).toEqual([
			null,
			null,
		]);
	});

	test("answers nothing at all for a field the frame does not have", () => {
		expect(ratioRowColors(frame_([1, 2]), "absent")).toEqual([]);
	});

	test("rescales as the worst row changes, since the domain is the data", () => {
		const near = ratioRowColors(frame_([1, 2]), "ratio")[1];
		const far = ratioRowColors(frame_([1, 2, 100]), "ratio")[1];
		expect(isRedderThan_(near!, far!)).toBe(true);
	});
});
