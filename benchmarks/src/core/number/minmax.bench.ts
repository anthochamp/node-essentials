import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { minmax } from "@ac-kit/core";
import { midrange } from "@ac-kit/math-stats";
import { extent as d3Extent, max as d3Max, min as d3Min } from "d3-array";

import { POSITIVE_VALUES } from "../../__fixtures__/numbers.js";

const { min: MIN, max: MAX } = minmax(POSITIVE_VALUES);
const MID = midrange(POSITIVE_VALUES);

durationCondition("Extremes — 10 000 values", () => {
	durationCase(
		"@ac-kit/.minmax",
		{ tags: { kind: "js", result: "both" } },
		() => {
			const { min, max } = minmax(POSITIVE_VALUES);
			assert.strictEqual(min, MIN);
			assert.strictEqual(max, MAX);
		},
	);
	durationCase(
		"@ac-kit/.midrange",
		{ tags: { kind: "js", result: "midpoint" } },
		() => assert.strictEqual(midrange(POSITIVE_VALUES), MID),
	);
	durationCase(
		"d3-array extent",
		{ tags: { kind: "js", result: "both" } },
		() => {
			const [min, max] = d3Extent(POSITIVE_VALUES) as [number, number];
			assert.strictEqual(min, MIN);
			assert.strictEqual(max, MAX);
		},
	);
	durationCase(
		"loop min+max",
		{ tags: { kind: "native", result: "both" } },
		() => {
			let min = Number.POSITIVE_INFINITY;
			let max = Number.NEGATIVE_INFINITY;
			for (const value of POSITIVE_VALUES) {
				if (value < min) min = value;
				if (value > max) max = value;
			}
			assert.strictEqual(min, MIN);
			assert.strictEqual(max, MAX);
		},
	);
	durationCase(
		"Math.min spread",
		{ tags: { kind: "native", result: "min" } },
		() => assert.strictEqual(Math.min(...POSITIVE_VALUES), MIN),
	);
	durationCase(
		"d3-array min + max (separate)",
		{ tags: { kind: "js", result: "both" } },
		() => {
			assert.strictEqual(d3Min(POSITIVE_VALUES), MIN);
			assert.strictEqual(d3Max(POSITIVE_VALUES), MAX);
		},
	);
});
