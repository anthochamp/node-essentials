import { expect, suite, test, vi } from "vitest";

import { spinnerGlyph } from "./spinner.js";

suite("spinnerGlyph", () => {
	test("cycles through the unicode frame set by default", () => {
		vi.useFakeTimers();
		try {
			vi.setSystemTime(0);
			const first = spinnerGlyph();
			vi.setSystemTime(100);
			const second = spinnerGlyph();
			expect(first).not.toBe(second);
			expect(first).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/u);
		} finally {
			vi.useRealTimers();
		}
	});

	test("falls back to ascii frames when requested", () => {
		vi.useFakeTimers();
		try {
			vi.setSystemTime(0);
			expect(spinnerGlyph({ style: "ascii" })).toBe("|");
		} finally {
			vi.useRealTimers();
		}
	});

	test("answers the same glyph within one interval, regardless of caller", () => {
		vi.useFakeTimers();
		try {
			vi.setSystemTime(250);
			expect(spinnerGlyph({ intervalMs: 200 })).toBe(
				spinnerGlyph({ intervalMs: 200 }),
			);
		} finally {
			vi.useRealTimers();
		}
	});
});
