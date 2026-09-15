import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";

import {
	NUMBERS_SAMPLE_SIZE,
	POSITIVE_VALUES,
} from "./__fixtures__/numbers.js";

const count = (...values: number[]): number => values.length;

durationCondition(
	`Argument passing — ${NUMBERS_SAMPLE_SIZE.toLocaleString("en-US")} values, no arithmetic`,
	() => {
		durationCase(
			"spread into a variadic function",
			{ tags: { kind: "native" } },
			() => assert.strictEqual(count(...POSITIVE_VALUES), NUMBERS_SAMPLE_SIZE),
		);
		durationCase("pass the array itself", { tags: { kind: "native" } }, () =>
			assert.strictEqual(POSITIVE_VALUES.length, NUMBERS_SAMPLE_SIZE),
		);
	},
);
