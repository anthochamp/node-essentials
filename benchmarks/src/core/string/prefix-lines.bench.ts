import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { hashString } from "@ac-bench/util";
import { prefixLines } from "@ac-kit/core";

import { PARAGRAPH } from "./__fixtures__/fixtures.js";

const PREFIX_WANTED = hashString(prefixLines(PARAGRAPH, "> ").join("\n"));

durationCondition("prefixLines — 1 100-character paragraph", () => {
	durationCase("@ac-kit/.prefixLines", { tags: { kind: "js" } }, () =>
		assert.strictEqual(
			hashString(prefixLines(PARAGRAPH, "> ").join("\n")),
			PREFIX_WANTED,
		),
	);
	durationCase("split, map, join", { tags: { kind: "native" } }, () =>
		assert.strictEqual(
			hashString(
				PARAGRAPH.split("\n")
					.map((line) => `> ${line}`)
					.join("\n"),
			),
			PREFIX_WANTED,
		),
	);
});
