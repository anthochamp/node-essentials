import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { isIterableEqual } from "@ac-kit/core";

import { INTEGERS } from "../../__fixtures__/numbers.js";

const LEFT = INTEGERS.slice();
const EQUAL = INTEGERS.slice();

const DIFFERS_FIRST = INTEGERS.slice();
DIFFERS_FIRST[0] = DIFFERS_FIRST[0]! + 1;

const DIFFERS_LAST = INTEGERS.slice();
DIFFERS_LAST[DIFFERS_LAST.length - 1] = DIFFERS_LAST.at(-1)! + 1;

const SHORTER = INTEGERS.slice(0, -1);

/** The hand-rolled shape `is-deep-equal.ts` uses today. */
function indexLoopEqual(a: readonly number[], b: readonly number[]): boolean {
	if (a.length !== b.length) {
		return false;
	}

	for (let index = 0; index < a.length; index++) {
		if (a[index] !== b[index]) {
			return false;
		}
	}

	return true;
}

const CASES = [
	["equal", EQUAL, true],
	["differing at the first element", DIFFERS_FIRST, false],
	["differing at the last element", DIFFERS_LAST, false],
	["of differing length", SHORTER, false],
] as const satisfies readonly (readonly [string, readonly number[], boolean])[];

for (const [label, right, expected] of CASES) {
	durationCondition(
		`isIterableEqual — ${LEFT.length} numbers, ${label}`,
		() => {
			durationCase(
				"index loop (hand-rolled)",
				{ tags: { kind: "native" } },
				() => assert.strictEqual(indexLoopEqual(LEFT, right), expected),
			);
			durationCase("Array.prototype.every", { tags: { kind: "native" } }, () =>
				assert.strictEqual(
					LEFT.length === right.length &&
						LEFT.every((value, index) => value === right[index]),
					expected,
				),
			);
			durationCase(
				"@ac-kit/core isIterableEqual (default strategy)",
				{ tags: { kind: "js" } },
				() => assert.strictEqual(isIterableEqual(LEFT, right), expected),
			);
			durationCase(
				"@ac-kit/core isIterableEqual (explicit comparator)",
				{ tags: { kind: "js" } },
				() =>
					assert.strictEqual(
						isIterableEqual(LEFT, right, (a, b) => a === b),
						expected,
					),
			);
		},
	);
}

durationCondition(
	`isIterableEqual — ${LEFT.length} numbers, non-array iterable`,
	() => {
		const leftSet = new Set(LEFT);
		const rightSet = new Set(EQUAL);

		durationCase(
			"@ac-kit/core isIterableEqual (Set against Set)",
			{ tags: { kind: "js" } },
			() => assert.strictEqual(isIterableEqual(leftSet, rightSet), true),
		);
		durationCase(
			"materialise then index loop",
			{ tags: { kind: "native" } },
			() =>
				assert.strictEqual(indexLoopEqual([...leftSet], [...rightSet]), true),
		);
	},
);
