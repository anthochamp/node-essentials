import { expect, suite, test } from "vitest";

import { GLYPH_NAMES, glyph, spinnerFrames } from "./glyph.js";
import { visibleWidth } from "./visible-width.js";

suite("glyph", () => {
	test("returns the unicode form by default", () => {
		expect(glyph("star")).toBe("★");
	});

	test("returns the ascii form on request", () => {
		expect(glyph("star", "ascii")).toBe("*");
	});

	// A glyph the layout engine measures as one column but the terminal draws as
	// two silently breaks every table it appears in.
	test("every unicode glyph measures one column", () => {
		const wide = GLYPH_NAMES.filter(
			(name) => visibleWidth(glyph(name)) !== glyph(name).length,
		);
		expect(wide).toEqual([]);
	});

	test("no unicode glyph carries an emoji variation selector", () => {
		const emoji = GLYPH_NAMES.filter((name) => glyph(name).includes("\uFE0F"));
		expect(emoji).toEqual([]);
	});

	test("every glyph has a non-empty ascii fallback", () => {
		const missing = GLYPH_NAMES.filter((name) => glyph(name, "ascii") === "");
		expect(missing).toEqual([]);
	});
});

suite("spinnerFrames", () => {
	test("cycles a named sequence", () => {
		expect(spinnerFrames("line")).toEqual(["|", "/", "-", "\\"]);
	});

	// A frame wider than its neighbours shifts whatever is drawn beside it on
	// every tick.
	test("every frame of a sequence is the same width", () => {
		for (const name of ["dots", "line", "arc", "grow", "arrows"] as const) {
			const widths = new Set(spinnerFrames(name).map(visibleWidth));
			expect(widths.size, name).toBe(1);
		}
	});
});
