import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { uniq } from "@ac-kit/algo";

import {
	QUADRATIC_INTEGERS,
	QUADRATIC_UNIQUE_INTEGERS,
} from "../../__fixtures__/numbers.js";

durationCondition(
	"uniq — 2 000 numbers, hashable strategy against pairwise",
	() => {
		durationCase(
			"@ac-kit/algo uniq (sameValueZero)",
			{ tags: { kind: "js" } },
			() =>
				assert.strictEqual(
					[...uniq(QUADRATIC_INTEGERS)].length,
					QUADRATIC_UNIQUE_INTEGERS,
				),
		);
		durationCase("[...new Set(array)]", { tags: { kind: "native" } }, () => {
			const unique = [...new Set(QUADRATIC_INTEGERS)];
			assert.strictEqual(unique.length, QUADRATIC_UNIQUE_INTEGERS);
		});
		durationCase("@ac-kit/algo uniq (strict)", { tags: { kind: "js" } }, () =>
			assert.strictEqual(
				[...uniq(QUADRATIC_INTEGERS, "strict")].length,
				QUADRATIC_UNIQUE_INTEGERS,
			),
		);
		durationCase("@ac-kit/algo uniq (loose)", { tags: { kind: "js" } }, () =>
			assert.strictEqual(
				[...uniq(QUADRATIC_INTEGERS, "loose")].length,
				QUADRATIC_UNIQUE_INTEGERS,
			),
		);
		durationCase(
			"@ac-kit/algo uniq (sameValue)",
			{ tags: { kind: "js" } },
			() =>
				assert.strictEqual(
					[...uniq(QUADRATIC_INTEGERS, "sameValue")].length,
					QUADRATIC_UNIQUE_INTEGERS,
				),
		);
		durationCase(
			"@ac-kit/algo uniq (custom predicate)",
			{ tags: { kind: "js" } },
			() =>
				assert.strictEqual(
					[...uniq(QUADRATIC_INTEGERS, (a, b) => a === b)].length,
					QUADRATIC_UNIQUE_INTEGERS,
				),
		);
	},
);
