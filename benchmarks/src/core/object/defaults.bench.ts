import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { defaults } from "@ac-kit/core";
import { defaults as lodashDefaults } from "lodash-es";

interface Options {
	position: "start" | "middle" | "end";
	wordCutting: boolean;
	ellipsisString: string;
	strictLength: boolean;
}
const PARTIAL: Partial<Options> = { position: "end", wordCutting: false };
const FALLBACK: Options = {
	position: "start",
	wordCutting: true,
	ellipsisString: "…",
	strictLength: true,
};

durationCondition("defaults — filling absent keys on an options object", () => {
	durationCase("@ac-kit/.defaults", { tags: { kind: "js" } }, () =>
		assert.strictEqual(defaults(PARTIAL, FALLBACK).ellipsisString, "…"),
	);
	durationCase("spread with fallback first", { tags: { kind: "native" } }, () =>
		assert.strictEqual({ ...FALLBACK, ...PARTIAL }.ellipsisString, "…"),
	);
	durationCase("lodash defaults (npm)", { tags: { kind: "js" } }, () =>
		assert.strictEqual(
			lodashDefaults({ ...PARTIAL }, FALLBACK).ellipsisString,
			"…",
		),
	);
});
