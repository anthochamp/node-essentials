import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { intersection } from "@ac-kit/algo";
import { count } from "@ac-kit/core";
import { intersection as lodashIntersection } from "lodash-es";

import { QUADRATIC_INTEGERS } from "../../__fixtures__/numbers.js";

const LEFT = [...new Set(QUADRATIC_INTEGERS)];
const RIGHT = LEFT.map((value) => value + 1);
const RIGHT_SET = new Set(RIGHT);
const WANTED = LEFT.filter((value) => RIGHT_SET.has(value)).length;

durationCondition(
	"intersection — two duplicate-free arrays, half of one overlapping",
	() => {
		durationCase("@ac-kit/.intersection", { tags: { kind: "js" } }, async () =>
			assert.strictEqual(count(intersection([LEFT, RIGHT])), WANTED),
		);
		durationCase("Set.has filter", { tags: { kind: "native" } }, () => {
			const lookup = new Set(RIGHT);
			assert.strictEqual(
				LEFT.filter((value) => lookup.has(value)).length,
				WANTED,
			);
		});
		durationCase("Set.intersection", { tags: { kind: "native" } }, () =>
			assert.strictEqual(
				new Set(LEFT).intersection(new Set(RIGHT)).size,
				WANTED,
			),
		);
		durationCase("lodash intersection (npm)", { tags: { kind: "js" } }, () =>
			assert.strictEqual(lodashIntersection(LEFT, RIGHT).length, WANTED),
		);
	},
);
