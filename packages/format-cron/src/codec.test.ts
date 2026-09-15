import { describe, expect, it } from "vitest";

import { cronMatches, nextRun } from "./codec.js";
import { parseCron } from "./parser.js";

describe("cronMatches", () => {
	it("matches every minute for '* * * * *'", () => {
		const schedule = parseCron("* * * * *");
		expect(cronMatches(schedule, new Date(2026, 0, 1, 3, 17))).toBe(true);
	});

	it("matches a specific minute/hour", () => {
		const schedule = parseCron("30 9 * * *");
		expect(cronMatches(schedule, new Date(2026, 0, 1, 9, 30))).toBe(true);
		expect(cronMatches(schedule, new Date(2026, 0, 1, 9, 31))).toBe(false);
		expect(cronMatches(schedule, new Date(2026, 0, 1, 10, 30))).toBe(false);
	});

	it("applies OR semantics when both day-of-month and day-of-week are restricted", () => {
		// "the 1st, OR any Monday" — not "the 1st AND a Monday"
		const schedule = parseCron("0 0 1 * MON");
		// 2026-01-01 is a Thursday, matches via day-of-month.
		expect(cronMatches(schedule, new Date(2026, 0, 1, 0, 0))).toBe(true);
		// 2026-01-05 is a Monday, matches via day-of-week.
		expect(cronMatches(schedule, new Date(2026, 0, 5, 0, 0))).toBe(true);
		// 2026-01-06 is a Tuesday and not the 1st: matches neither.
		expect(cronMatches(schedule, new Date(2026, 0, 6, 0, 0))).toBe(false);
	});

	it("applies AND semantics when only day-of-month is restricted", () => {
		const schedule = parseCron("0 0 1 * *");
		expect(cronMatches(schedule, new Date(2026, 0, 1, 0, 0))).toBe(true);
		expect(cronMatches(schedule, new Date(2026, 0, 2, 0, 0))).toBe(false);
	});
});

describe("nextRun", () => {
	it("finds the next matching minute", () => {
		const schedule = parseCron("30 9 * * *");
		const from = new Date(2026, 0, 1, 9, 30); // already at a match
		const found = nextRun(schedule, from);
		expect(found).toEqual(new Date(2026, 0, 2, 9, 30));
	});

	it("crosses a month boundary", () => {
		const schedule = parseCron("0 0 1 * *");
		const from = new Date(2026, 0, 15, 12, 0);
		const found = nextRun(schedule, from);
		expect(found).toEqual(new Date(2026, 1, 1, 0, 0));
	});

	it("throws when the schedule can never match", () => {
		// February never has a 30th.
		const schedule = parseCron("0 0 30 2 *");
		expect(() => nextRun(schedule, new Date(2026, 0, 1))).toThrow();
	});
});
