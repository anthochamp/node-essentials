import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { compact } from "@ac-kit/core";
import { compact as lodashCompact } from "lodash-es";

import { INTEGERS } from "../../__fixtures__/numbers.js";

const SPARSE: (number | string | boolean | null | undefined)[] = INTEGERS.map(
	(value, index) =>
		index % 3 === 0
			? null
			: index % 7 === 0
				? undefined
				: index % 11 === 0
					? ""
					: index % 13 === 0
						? false
						: value,
);
const WANTED = SPARSE.filter(
	(value) => value !== null && value !== undefined,
).length;

durationCondition(
	`compact — ${SPARSE.length} entries, roughly half nullish`,
	() => {
		durationCase("@ac-kit/core compact", { tags: { kind: "js" } }, () =>
			assert.strictEqual(Array.from(compact(SPARSE)).length, WANTED),
		);
		durationCase("filter(Boolean)", { tags: { kind: "native" } }, () =>
			assert.strictEqual(SPARSE.filter(Boolean).length, WANTED),
		);
		durationCase("explicit nullish filter", { tags: { kind: "native" } }, () =>
			assert.strictEqual(
				SPARSE.filter((value) => value !== null && value !== undefined).length,
				WANTED,
			),
		);
		durationCase("lodash compact (npm)", { tags: { kind: "js" } }, () =>
			assert.strictEqual(lodashCompact(SPARSE).length, WANTED),
		);
	},
);
