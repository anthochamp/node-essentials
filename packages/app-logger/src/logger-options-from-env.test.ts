import { expect, suite, test } from "vitest";

import { loggerOptionsFromEnv } from "./logger-options-from-env.js";

suite("loggerOptionsFromEnv", () => {
	test("returns empty options when DEBUG is not set", () => {
		expect(loggerOptionsFromEnv({})).toEqual({});
	});

	test("returns empty options when DEBUG is falsy", () => {
		expect(loggerOptionsFromEnv({ DEBUG: "0" })).toEqual({});
	});

	test("enables debug-level logging and stack capture when DEBUG is truthy", () => {
		expect(loggerOptionsFromEnv({ DEBUG: "1" })).toEqual({
			minLevel: "debug",
			captureStackAtOrBelow: "debug",
		});
	});
});
