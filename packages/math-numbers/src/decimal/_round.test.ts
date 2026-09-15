import { describe, expect, it } from "vitest";

import { RoundingMode } from "../rounding-mode.js";
import { decimalRound } from "./_round.js";

describe("decimalRound", () => {
	const cases: readonly [RoundingMode, bigint][] = [
		["down", 2n],
		["up", 3n],
		["floor", 2n],
		["ceiling", 3n],
		["half-up", 3n],
		["half-down", 2n],
		["half-even", 2n],
		["half-odd", 3n],
		["half-ceiling", 3n],
		["half-floor", 2n],
	];

	it.each(cases)("rounds an exact positive tie under %s", (mode, expected) => {
		// 2.5 as quotient 2 remainder 5 over divisor 10.
		expect(decimalRound(2n, 5n, 10n, mode)).toBe(expected);
	});

	it("sends a negative tie the other way for the directed halves", () => {
		// −2.5 as quotient −2 remainder −5 over divisor 10.
		expect(decimalRound(-2n, -5n, 10n, "half-ceiling")).toBe(-2n);
		expect(decimalRound(-2n, -5n, 10n, "half-floor")).toBe(-3n);
	});

	it("returns the quotient untouched when the division is exact", () => {
		for (const [mode] of cases) {
			expect(decimalRound(7n, 0n, 10n, mode)).toBe(7n);
		}
	});

	it("refuses to round under 'unnecessary'", () => {
		expect(() => decimalRound(2n, 5n, 10n, "unnecessary")).toThrow(RangeError);
		expect(decimalRound(2n, 0n, 10n, "unnecessary")).toBe(2n);
	});
});
