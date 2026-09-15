import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { clamp } from "@ac-kit/core";

import { POSITIVE_VALUES } from "../../__fixtures__/numbers.js";

const MIN = 0.1;
const MAX = 0.9;
const CLAMP_WANTED = POSITIVE_VALUES.filter(
	(value) => value >= MIN && value <= MAX,
).length;

durationCondition("clamp — 10 000 values", () => {
	durationCase("@ac-kit/.clamp array", { tags: { kind: "js" } }, () => {
		let in_range = 0;
		for (const value of POSITIVE_VALUES) {
			if (clamp(value, MIN, MAX) === value) in_range++;
		}
		assert.strictEqual(in_range, CLAMP_WANTED);
	});
	durationCase("Math.min/max clamp", { tags: { kind: "native" } }, () => {
		let in_range = 0;
		for (const value of POSITIVE_VALUES) {
			if (Math.min(Math.max(value, MIN), MAX) === value) in_range++;
		}
		assert.strictEqual(in_range, CLAMP_WANTED);
	});
});
