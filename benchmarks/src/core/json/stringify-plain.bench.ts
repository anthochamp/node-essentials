import assert from "node:assert";
import { serialize as v8Serialize } from "node:v8";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { jsonStringifySafe } from "@ac-kit/core";
import safeStableStringify from "safe-stable-stringify";

import { PAYLOAD, textCase } from "./__fixtures__/fixtures.js";

durationCondition("stringify — plain payload, 2 000 records", () => {
	textCase("@ac-kit/.jsonStringify", "js", () => jsonStringifySafe(PAYLOAD)!, {
		output: "json",
	});
	textCase("JSON.stringify", "native", () => JSON.stringify(PAYLOAD), {
		output: "json",
	});
	textCase(
		"safe-stable-stringify (npm)",
		"js",
		() => safeStableStringify(PAYLOAD),
		{ output: "json, sorted keys" },
	);
	durationCase(
		"v8.serialize",
		{ tags: { kind: "native", output: "v8 binary" } },
		() => assert.strictEqual(v8Serialize(PAYLOAD).length > 0, true),
	);
});
