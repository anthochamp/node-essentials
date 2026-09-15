import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { round } from "@ac-kit/core";

import { POSITIVE_VALUES } from "../../__fixtures__/numbers.js";

durationCondition(`round (2 dp) — ${POSITIVE_VALUES.length} values`, () => {
	durationCase("@ac-kit/core round (2 dp)", { tags: { kind: "js" } }, () => {
		let sum = 0;
		for (const value of POSITIVE_VALUES) {
			sum += round(value, { fractionDigits: 2 });
		}
		assert.strictEqual(sum > 0, true);
	});
	durationCase(
		"Number.toFixed round trip",
		{ tags: { kind: "native" } },
		() => {
			let sum = 0;
			for (const value of POSITIVE_VALUES) {
				sum += Number(value.toFixed(2));
			}
			assert.strictEqual(sum > 0, true);
		},
	);
	durationCase("Math.round round trip", { tags: { kind: "native" } }, () => {
		let sum = 0;
		for (const value of POSITIVE_VALUES) {
			sum += Math.round(value * 100) / 100;
		}
		assert.strictEqual(sum > 0, true);
	});
});
