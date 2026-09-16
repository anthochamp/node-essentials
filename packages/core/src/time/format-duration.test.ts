import { expect, suite, test } from "vitest";

import { formatDuration } from "./format-duration.js";

// Every expectation below is an exact rendering, so each one pins `locale`:
// left to the host default these assert whatever CLDR the developer's machine
// happens to be set to (fr-FR renders a narrow minute as `min`, en-US as `m`).
suite("formatDuration", () => {
	test("selects the given unit when its own magnitude already qualifies", () => {
		expect(formatDuration(2, "millisecond", { locale: "en" })).toBe("2ms");
	});

	test("drills into a finer unit when the given unit's magnitude is below 1", () => {
		expect(formatDuration(0.5, "second", { locale: "en" })).toBe("500ms");
	});

	test("rolls up into a coarser unit when the given unit's magnitude is at least 1", () => {
		expect(formatDuration(90_000, "millisecond", { locale: "en" })).toBe(
			"1m 30s",
		);
	});

	test("shows extra precision via a subordinate unit", () => {
		expect(formatDuration(1234, "millisecond", { locale: "en" })).toBe(
			"1s 234ms",
		);
	});

	test("rounds the last shown field instead of truncating", () => {
		expect(formatDuration(1999.6, "millisecond", { locale: "en" })).toBe("2s");
	});

	test("carries a rounded-up field across two coarser units", () => {
		expect(
			formatDuration(59_600, "millisecond", { locale: "en", precision: 1 }),
		).toBe("1m");
	});

	test("respects a lower precision by showing fewer subordinate fields", () => {
		expect(
			formatDuration(1234, "millisecond", { locale: "en", precision: 1 }),
		).toBe("1s");
	});

	test("respects a higher precision by showing more subordinate fields", () => {
		expect(
			formatDuration(1234.5, "millisecond", { locale: "en", precision: 6 }),
		).toBe("1s 234ms 500μs");
	});

	test("never selects a unit finer than minUnit", () => {
		expect(
			formatDuration(1234, "millisecond", { locale: "en", minUnit: "second" }),
		).toBe("1s");
	});

	test("formats a zero duration in the given unit, not the smallest one", () => {
		expect(formatDuration(0, "millisecond", { locale: "en" })).toBe("0ms");
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
