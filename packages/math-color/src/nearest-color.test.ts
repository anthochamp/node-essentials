import { expect, suite, test } from "vitest";

import { rgb8ToOklab } from "./conversions/rgb8-oklab.js";
import { Rgb8 } from "./encoding/rgb8/rgb8.js";
import {
	createNearestColorFinder,
	EmptyPaletteError,
} from "./nearest-color.js";

const PALETTE: readonly Rgb8[] = [
	{ r8: 0, g8: 0, b8: 0 },
	{ r8: 255, g8: 0, b8: 0 },
	{ r8: 255, g8: 255, b8: 255 },
];

function finder_() {
	return createNearestColorFinder(PALETTE, rgb8ToOklab);
}

suite("createNearestColorFinder", () => {
	test("returns an entry it was given, not a copy", () => {
		expect(finder_()(rgb8ToOklab({ r8: 250, g8: 10, b8: 10 }))).toBe(
			PALETTE[1],
		);
	});

	test("returns the exact entry for a colour already in the palette", () => {
		const find = finder_();
		for (const color of PALETTE) {
			expect(find(rgb8ToOklab(color))).toBe(color);
		}
	});

	test("picks by perceptual distance, not by channel arithmetic", () => {
		expect(finder_()(rgb8ToOklab({ r8: 200, g8: 200, b8: 200 }))).toBe(
			PALETTE[2],
		);
	});

	// The conversion belongs to the registration, so the source is read once.
	test("does not observe a later change to the source palette", () => {
		const entries = [...PALETTE];
		const find = createNearestColorFinder(entries, rgb8ToOklab);
		entries.push({ r8: 0, g8: 255, b8: 0 });
		expect(find(rgb8ToOklab({ r8: 0, g8: 250, b8: 0 }))).not.toBe(entries[3]);
	});

	test("rejects an empty palette at construction, not at lookup", () => {
		expect(() => createNearestColorFinder([], rgb8ToOklab)).toThrow(
			EmptyPaletteError,
		);
	});
});
