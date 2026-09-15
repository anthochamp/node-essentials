import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { hashString } from "@ac-bench/util";
import { joinNonEmpty } from "@ac-kit/core";

import { IDENTIFIERS } from "./__fixtures__/fixtures.js";

const PARTS: (string | null | undefined)[] = IDENTIFIERS.slice(0, 500).map(
	(value, index) => (index % 4 === 0 ? null : index % 4 === 2 ? null : value),
);
const JOIN_WANTED = hashString(joinNonEmpty(PARTS, ", "));

durationCondition("joinNonEmpty — 500 parts, one quarter nullish", () => {
	durationCase("@ac-kit/.joinNonEmpty", { tags: { kind: "js" } }, () =>
		assert.strictEqual(hashString(joinNonEmpty(PARTS, ", ")), JOIN_WANTED),
	);
	durationCase("filter then join", { tags: { kind: "native" } }, () =>
		assert.strictEqual(
			hashString(
				PARTS.filter(
					(value): value is string =>
						typeof value === "string" && value.length > 0,
				).join(", "),
			),
			JOIN_WANTED,
		),
	);
});
