import assert from "assert";

import {
	beforeEach,
	durationCase,
	durationCondition,
} from "@ac-bench/measure-duration";
import { removeAll } from "@ac-kit/core";
import { pull as lodashPull } from "lodash-es";

import { QUADRATIC_INTEGERS } from "../../__fixtures__/numbers.js";

const TARGET = QUADRATIC_INTEGERS[0]!;
const OCCURRENCES = QUADRATIC_INTEGERS.filter(
	(value) => value === TARGET,
).length;
const REMAINING = QUADRATIC_INTEGERS.length - OCCURRENCES;

durationCondition("removeAll — every occurrence of one value in place", () => {
	let array: number[];

	beforeEach(() => {
		array = QUADRATIC_INTEGERS.slice();
	});

	durationCase("@ac-kit/core removeAll", { tags: { kind: "js" } }, () => {
		removeAll(array, TARGET);
		assert.strictEqual(array.length, REMAINING);
	});
	durationCase("lodash pull (npm)", { tags: { kind: "js" } }, () => {
		lodashPull(array, TARGET);
		assert.strictEqual(array.length, REMAINING);
	});
	durationCase("filter", { tags: { kind: "native" } }, () => {
		assert.strictEqual(
			array.filter((value) => value !== TARGET).length,
			REMAINING,
		);
	});
	durationCase("reverse splice loop", { tags: { kind: "native" } }, () => {
		for (let index = array.length - 1; index >= 0; index--) {
			if (array[index] === TARGET) {
				array.splice(index, 1);
			}
		}
		assert.strictEqual(array.length, REMAINING);
	});
});
