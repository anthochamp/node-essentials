import { expect, suite, test } from "vitest";

import { formatDuration } from "./format-duration.js";

suite("formatDuration", () => {
	test("selects the given unit when its own magnitude already qualifies", () => {
		expect(formatDuration(2, "millisecond")).toBe("2ms");
	});

	test("drills into a finer unit when the given unit's magnitude is below 1", () => {
		expect(formatDuration(0.5, "second")).toBe("500ms");
	});

	test("rolls up into a coarser unit when the given unit's magnitude is at least 1", () => {
		expect(formatDuration(90_000, "millisecond")).toBe("1min 30s");
	});

	test("shows extra precision via a subordinate unit", () => {
		expect(formatDuration(1234, "millisecond")).toBe("1s 234ms");
	});

	test("rounds the last shown field instead of truncating", () => {
		expect(formatDuration(1999.6, "millisecond")).toBe("2s");
	});

	test("carries a rounded-up field across two coarser units", () => {
		expect(formatDuration(59_600, "millisecond", { precision: 1 })).toBe(
			"1min",
		);
	});

	test("respects a lower precision by showing fewer subordinate fields", () => {
		expect(formatDuration(1234, "millisecond", { precision: 1 })).toBe("1s");
	});

	test("respects a higher precision by showing more subordinate fields", () => {
		expect(formatDuration(1234.5, "millisecond", { precision: 6 })).toBe(
			"1s 234ms 500μs",
		);
	});

	test("never selects a unit finer than minUnit", () => {
		expect(formatDuration(1234, "millisecond", { minUnit: "second" })).toBe(
			"1s",
		);
	});

	test("formats a zero duration in the given unit, not the smallest one", () => {
		expect(formatDuration(0, "millisecond")).toBe("0ms");
	});

	test("formats a zero duration for the long style", () => {
		expect(formatDuration(0, "second", { style: "long", locale: "en" })).toBe(
			"0 seconds",
		);
	});

	test("supports the digital style", () => {
		expect(
			formatDuration(5000, "millisecond", { style: "digital", locale: "en" }),
		).toBe("0:00:05");
	});

	test("rejects a negative value", () => {
		expect(() => formatDuration(-1, "millisecond")).toThrow(RangeError);
	});

	test("rejects a non-finite value", () => {
		expect(() => formatDuration(Number.NaN, "millisecond")).toThrow(RangeError);
	});
});
