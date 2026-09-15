import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { uniqBy } from "@ac-kit/algo";
import { uniqBy as lodashUniqBy } from "lodash-es";

import { INTEGERS, UNIQUE_INTEGERS } from "../../__fixtures__/numbers.js";

const RECORDS = INTEGERS.map((value, index) => ({ id: value, index }));
const KEY = (record: { id: number }) => record.id;

durationCondition("uniqBy — 20 000 records keyed by a selector", () => {
	durationCase("Map keyed by selector", { tags: { kind: "native" } }, () => {
		const seen = new Map<number, { id: number; index: number }>();
		for (const record of RECORDS) {
			if (!seen.has(record.id)) {
				seen.set(record.id, record);
			}
		}
		assert.strictEqual(seen.size, UNIQUE_INTEGERS);
	});
	durationCase("@ac-kit/.uniqBy", { tags: { kind: "js" } }, () =>
		assert.strictEqual([...uniqBy(RECORDS, KEY)].length, UNIQUE_INTEGERS),
	);
	durationCase("lodash uniqBy (npm)", { tags: { kind: "js" } }, () =>
		assert.strictEqual(lodashUniqBy(RECORDS, KEY).length, UNIQUE_INTEGERS),
	);
});
