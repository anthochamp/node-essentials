import { durationCondition } from "@ac-bench/measure-duration";
import { jsonStringifySafe } from "@ac-kit/core";
import safeStableStringify from "safe-stable-stringify";

import { PAYLOAD, textCase } from "./__fixtures__/fixtures.js";

durationCondition("stringify — indented output, 2 000 records", () => {
	textCase("@ac-kit/.jsonStringify", "js", () =>
		jsonStringifySafe(PAYLOAD, undefined, 2),
	);
	textCase("JSON.stringify", "native", () =>
		JSON.stringify(PAYLOAD, undefined, 2),
	);
	textCase("safe-stable-stringify (npm)", "js", () =>
		safeStableStringify(PAYLOAD, undefined, 2),
	);
});
