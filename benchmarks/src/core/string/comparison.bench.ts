import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { stringIsEqual, stripDiacritics } from "@ac-kit/core";

import { COLLATOR, SENTENCE } from "./__fixtures__/fixtures.js";

const LEFT = SENTENCE;
const RIGHT = SENTENCE.toUpperCase();
const OPTIONS = { caseInsensitive: true } as const;

durationCondition("comparison — case- and accent-insensitive", () => {
	durationCase(
		"@ac-kit/.stringIsEqual + stripDiacritics",
		{ tags: { kind: "js" } },
		() =>
			assert.strictEqual(
				stringIsEqual(stripDiacritics(LEFT), stripDiacritics(RIGHT), OPTIONS),
				true,
			),
	);
	durationCase("toLowerCase comparison", { tags: { kind: "native" } }, () =>
		assert.strictEqual(LEFT.toLowerCase() === RIGHT.toLowerCase(), true),
	);
	durationCase(
		"Intl.Collator (sensitivity: base)",
		{ tags: { kind: "native" } },
		() => assert.strictEqual(COLLATOR.compare(LEFT, RIGHT) === 0, true),
	);
	durationCase("localeCompare", { tags: { kind: "native" } }, () =>
		assert.strictEqual(
			LEFT.localeCompare(RIGHT, undefined, { sensitivity: "base" }) === 0,
			true,
		),
	);
});
