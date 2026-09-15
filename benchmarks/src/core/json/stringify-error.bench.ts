import { durationCondition } from "@ac-bench/measure-duration";
import { jsonStringifySafe } from "@ac-kit/core";
import { serializeError } from "serialize-error";

import {
	buildErrorPayload,
	inspect,
	textCase,
} from "./__fixtures__/fixtures.js";

const ERROR_PAYLOAD = buildErrorPayload();

durationCondition("stringify — Error payload, 200 records", () => {
	textCase(
		"@ac-kit/.jsonStringify",
		"js",
		() => jsonStringifySafe(ERROR_PAYLOAD)!,
		{ output: "message, stack, cause" },
	);
	textCase("JSON.stringify", "native", () => JSON.stringify(ERROR_PAYLOAD)!, {
		output: "empty objects",
	});
	textCase(
		"serialize-error (npm)",
		"js",
		() => JSON.stringify(serializeError(ERROR_PAYLOAD)),
		{ output: "message, stack, cause" },
	);
	textCase(
		"util.inspect",
		"native",
		() => inspect(ERROR_PAYLOAD, { depth: null }),
		{ output: "not parseable" },
	);
});
