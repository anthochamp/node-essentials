import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { hashString } from "@ac-bench/util";
import { jsonSerialize } from "@ac-kit/core";

import { PAYLOAD } from "./__fixtures__/fixtures.js";

const WANTED = hashString(JSON.stringify(jsonSerialize(PAYLOAD)));

durationCondition(
	"jsonSerialize — 2 000 records to plain JSON-safe object",
	() => {
		durationCase("@ac-kit/.jsonSerialize", { tags: { kind: "js" } }, () =>
			assert.strictEqual(
				hashString(JSON.stringify(jsonSerialize(PAYLOAD))),
				WANTED,
			),
		);
		durationCase("JSON round trip", { tags: { kind: "native" } }, () =>
			assert.strictEqual(
				hashString(JSON.stringify(JSON.parse(JSON.stringify(PAYLOAD)))),
				WANTED,
			),
		);
		durationCase("structuredClone", { tags: { kind: "native" } }, () =>
			assert.strictEqual(
				hashString(JSON.stringify(structuredClone(PAYLOAD))),
				WANTED,
			),
		);
	},
);
