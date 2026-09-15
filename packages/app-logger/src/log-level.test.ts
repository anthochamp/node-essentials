import { expect, suite, test } from "vitest";

import { compareLogLevel, LogLevel, logLevelSeverity } from "./log-level.js";

suite("compareLogLevel", () => {
	test("returns a negative number when a is more severe than b", () => {
		expect(compareLogLevel("fatal", "error")).toBeLessThan(0);
	});

	test("returns a positive number when a is less severe than b", () => {
		expect(compareLogLevel("debug", "info")).toBeGreaterThan(0);
	});

	test("returns 0 when equal", () => {
		expect(compareLogLevel("warn", "warn")).toBe(0);
	});

	test("orders every level consistently by severity", () => {
		const ordered: LogLevel[] = ["fatal", "error", "warn", "info", "debug"];

		for (let index = 0; index < ordered.length - 1; index++) {
			expect(
				compareLogLevel(ordered[index]!, ordered[index + 1]!),
			).toBeLessThan(0);
		}
	});
});

suite("logLevelSeverity", () => {
	test("maps onto the 0 (most severe) to 100 (least severe) scale", () => {
		expect(logLevelSeverity("fatal")).toBeLessThan(logLevelSeverity("debug"));
		expect(logLevelSeverity("fatal")).toBeGreaterThanOrEqual(0);
		expect(logLevelSeverity("debug")).toBeLessThanOrEqual(100);
	});
});
