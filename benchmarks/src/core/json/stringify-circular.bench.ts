import { durationCondition } from "@ac-bench/measure-duration";
import { jsonStringifySafe } from "@ac-kit/core";
import { stringify as flattedStringify } from "flatted";
import jsonStringifySafeLib from "json-stringify-safe";
import safeStableStringify from "safe-stable-stringify";

import {
	buildCircularGraph,
	inspect,
	textCase,
} from "./__fixtures__/fixtures.js";

const GRAPH = buildCircularGraph();

durationCondition("stringify — circular graph, 500 nodes", () => {
	textCase(
		"@ac-kit/core jsonStringifySafe",
		"js",
		() => jsonStringifySafe(GRAPH),
		{
			output: "placeholder",
		},
	);
	textCase(
		"json-stringify-safe (npm)",
		"js",
		() => jsonStringifySafeLib(GRAPH),
		{
			output: "placeholder",
		},
	);
	textCase(
		"safe-stable-stringify (npm)",
		"js",
		() => safeStableStringify(GRAPH)!,
		{ output: "placeholder" },
	);
	textCase("flatted (npm)", "js", () => flattedStringify(GRAPH), {
		output: "reversible",
	});
	textCase("util.inspect", "native", () => inspect(GRAPH, { depth: null }), {
		output: "not parseable",
	});
});
