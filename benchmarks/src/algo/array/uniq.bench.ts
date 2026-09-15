import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { uniq } from "@ac-kit/algo";
import { uniq as lodashUniq } from "lodash-es";

import { INTEGERS, UNIQUE_INTEGERS } from "../../__fixtures__/numbers.js";

durationCondition("uniq — 20 000 numbers, half of them duplicates", () => {
	durationCase(
		"@ac-kit/algo uniq (sameValueZero)",
		{ tags: { kind: "js" } },
		() =>
			assert.strictEqual(Array.from(uniq(INTEGERS)).length, UNIQUE_INTEGERS),
	);
	durationCase("[...new Set(array)]", { tags: { kind: "native" } }, () => {
		const unique = [...new Set(INTEGERS)];
		assert.strictEqual(unique.length, UNIQUE_INTEGERS);
	});
	durationCase(
		"Array.from(new Set(array))",
		{ tags: { kind: "native" } },
		() => {
			const unique = Array.from(new Set(INTEGERS));
			assert.strictEqual(unique.length, UNIQUE_INTEGERS);
		},
	);
	durationCase("lodash uniq (npm)", { tags: { kind: "js" } }, () =>
		assert.strictEqual(lodashUniq(INTEGERS).length, UNIQUE_INTEGERS),
	);
});
