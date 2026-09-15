import { describe, expect, it } from "vitest";

import { CRON_FIELD_SPECS } from "./field-spec.js";
import { CronParseError, parseCron, parseCronField } from "./parser.js";

describe("parseCronField", () => {
	it("parses a wildcard", () => {
		expect(parseCronField("*", CRON_FIELD_SPECS.minute)).toEqual([
			{ kind: "wildcard" },
		]);
	});

	it("parses a stepped wildcard", () => {
		expect(parseCronField("*/15", CRON_FIELD_SPECS.minute)).toEqual([
			{ kind: "wildcard", step: 15 },
		]);
	});

	it("parses a single value", () => {
		expect(parseCronField("5", CRON_FIELD_SPECS.hour)).toEqual([
			{ kind: "value", value: 5 },
		]);
	});

	it("parses a range", () => {
		expect(parseCronField("1-5", CRON_FIELD_SPECS.hour)).toEqual([
			{ kind: "range", from: 1, to: 5 },
		]);
	});

	it("parses a stepped range", () => {
		expect(parseCronField("1-10/2", CRON_FIELD_SPECS.minute)).toEqual([
			{ kind: "range", from: 1, to: 10, step: 2 },
		]);
	});

	it("parses `value/step` as a range through the field maximum", () => {
		expect(parseCronField("10/5", CRON_FIELD_SPECS.minute)).toEqual([
			{ kind: "range", from: 10, to: 59, step: 5 },
		]);
	});

	it("parses a comma-separated list", () => {
		expect(parseCronField("1,3,5", CRON_FIELD_SPECS.hour)).toEqual([
			{ kind: "value", value: 1 },
			{ kind: "value", value: 3 },
			{ kind: "value", value: 5 },
		]);
	});

	it("resolves month names case-insensitively", () => {
		expect(parseCronField("jan,DEC", CRON_FIELD_SPECS.month)).toEqual([
			{ kind: "value", value: 1 },
			{ kind: "value", value: 12 },
		]);
	});

	it("resolves day-of-week names", () => {
		expect(parseCronField("MON-FRI", CRON_FIELD_SPECS.dayOfWeek)).toEqual([
			{ kind: "range", from: 1, to: 5 },
		]);
	});

	it("wraps day-of-week 7 to 0 (Sunday)", () => {
		expect(parseCronField("7", CRON_FIELD_SPECS.dayOfWeek)).toEqual([
			{ kind: "value", value: 0 },
		]);
	});

	it("throws CronParseError for an out-of-range value", () => {
		expect(() => parseCronField("60", CRON_FIELD_SPECS.minute)).toThrow(
			CronParseError,
		);
	});

	it("throws CronParseError for an unknown name", () => {
		expect(() => parseCronField("FOO", CRON_FIELD_SPECS.month)).toThrow(
			CronParseError,
		);
	});

	it("throws CronParseError for a non-positive step", () => {
		expect(() => parseCronField("*/0", CRON_FIELD_SPECS.minute)).toThrow(
			CronParseError,
		);
	});

	it("throws CronParseError on trailing input", () => {
		expect(() => parseCronField("5*", CRON_FIELD_SPECS.hour)).toThrow(
			CronParseError,
		);
	});
});

describe("parseCron", () => {
	it("parses a full 5-field expression", () => {
		expect(parseCron("*/15 0 1,15 * 1-5")).toEqual({
			minute: [{ kind: "wildcard", step: 15 }],
			hour: [{ kind: "value", value: 0 }],
			dayOfMonth: [
				{ kind: "value", value: 1 },
				{ kind: "value", value: 15 },
			],
			month: [{ kind: "wildcard" }],
			dayOfWeek: [{ kind: "range", from: 1, to: 5 }],
		});
	});

	it("throws CronParseError when the field count is wrong", () => {
		expect(() => parseCron("* * * *")).toThrow(CronParseError);
	});
});
