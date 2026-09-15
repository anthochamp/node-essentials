import { expect, suite, test } from "vitest";

import { aggregateScopeStatus } from "./aggregate-scope-status.js";

suite("aggregateScopeStatus", () => {
	test("is ok for an empty input", () => {
		expect(aggregateScopeStatus([])).toBe("ok");
	});

	test("is ok when every status is ok", () => {
		expect(aggregateScopeStatus(["ok", "ok"])).toBe("ok");
	});

	test("failed takes precedence over everything else", () => {
		expect(aggregateScopeStatus(["ok", "skipped", "failed", "cancelled"])).toBe(
			"failed",
		);
	});

	test("cancelled takes precedence over skipped and ok", () => {
		expect(aggregateScopeStatus(["ok", "skipped", "cancelled"])).toBe(
			"cancelled",
		);
	});

	test("skipped takes precedence over ok", () => {
		expect(aggregateScopeStatus(["ok", "skipped"])).toBe("skipped");
	});
});
