import { durationCondition } from "@ac-bench/measure-duration";
import {
	jsonMakeBigIntReplacerFunction,
	jsonStringifySafe,
} from "@ac-kit/core";
import safeStableStringify from "safe-stable-stringify";

import { PAYLOAD, textCase } from "./__fixtures__/fixtures.js";

const BIG_PAYLOAD = PAYLOAD.slice(0, 500).map((record) => ({
	...record,
	big: BigInt(record.id) * 1_000_000_007n,
}));
const MANUAL_REPLACER = (_key: string, value: unknown) =>
	typeof value === "bigint" ? value.toString() : value;
const COMPOSED_REPLACER = jsonMakeBigIntReplacerFunction();

durationCondition("stringify — BigInt payload, 500 records", () => {
	textCase("@ac-kit/.jsonStringify", "js", () =>
		jsonStringifySafe(BIG_PAYLOAD),
	);
	textCase("@ac-kit/.BigInt replacer only", "js", () =>
		JSON.stringify(BIG_PAYLOAD, COMPOSED_REPLACER)!,
	);
	textCase("hand-written replacer", "native", () =>
		JSON.stringify(BIG_PAYLOAD, MANUAL_REPLACER)!,
	);
	textCase("safe-stable-stringify (npm)", "js", () =>
		safeStableStringify(BIG_PAYLOAD),
	);
});
