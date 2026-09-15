import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { hashString } from "@ac-bench/util";
import { truncate } from "@ac-kit/core";
import { truncate as lodashTruncate } from "lodash-es";

import { SENTENCE } from "./__fixtures__/fixtures.js";

const LIMIT = 40;
const END_WANTED = hashString(truncate(SENTENCE, LIMIT));
const MIDDLE_WANTED = hashString(
	truncate(SENTENCE, LIMIT, { position: "middle" }),
);
const LODASH_WANTED = hashString(
	lodashTruncate(SENTENCE, { length: LIMIT, omission: "…" }),
);

durationCondition(
	"truncate — 1 100-character sentence to 40 characters",
	() => {
		durationCase("@ac-kit/.truncate (end)", { tags: { kind: "js" } }, () =>
			assert.strictEqual(hashString(truncate(SENTENCE, LIMIT)), END_WANTED),
		);
		durationCase("@ac-kit/.truncate (middle)", { tags: { kind: "js" } }, () =>
			assert.strictEqual(
				hashString(truncate(SENTENCE, LIMIT, { position: "middle" })),
				MIDDLE_WANTED,
			),
		);
		durationCase(
			"slice and append ellipsis",
			{ tags: { kind: "native" } },
			() =>
				assert.strictEqual(
					hashString(`${SENTENCE.slice(0, LIMIT - 1)}…`),
					END_WANTED,
				),
		);
		durationCase("lodash truncate (npm)", { tags: { kind: "js" } }, () =>
			assert.strictEqual(
				hashString(lodashTruncate(SENTENCE, { length: LIMIT, omission: "…" })),
				LODASH_WANTED,
			),
		);
	},
);
