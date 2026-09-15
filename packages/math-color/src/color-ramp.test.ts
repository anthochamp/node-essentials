import { expect, suite, test } from "vitest";

import { createColorRamp, sampleRamp } from "./color-ramp.js";
import { oklabToRgb8, rgb8ToOklab } from "./conversions/rgb8-oklab.js";
import { Oklab } from "./spaces/color-spaces.js";

const BLACK = rgb8ToOklab({ r8: 0, g8: 0, b8: 0 });
const WHITE = rgb8ToOklab({ r8: 255, g8: 255, b8: 255 });
const RED = rgb8ToOklab({ r8: 255, g8: 0, b8: 0 });

function lightness_(color: Oklab): number {
	return color.L;
}

suite("createColorRamp", () => {
	test("returns the stops themselves at their own positions", () => {
		const ramp = createColorRamp([BLACK, WHITE]);
		expect(ramp(0)).toEqual(BLACK);
		expect(ramp(1)).toEqual(WHITE);
	});

	test("lands on an interior stop exactly", () => {
		const ramp = createColorRamp([BLACK, RED, WHITE]);
		expect(ramp(0.5)).toEqual(RED);
	});

	// A ramp has no meaning past its ends, so an out-of-range position is the
	// nearest end rather than an extrapolation.
	test("clamps a position outside the range", () => {
		const ramp = createColorRamp([BLACK, WHITE]);
		expect(ramp(-1)).toEqual(BLACK);
		expect(ramp(2)).toEqual(WHITE);
	});

	test("increases monotonically in lightness between two greys", () => {
		const ramp = createColorRamp([BLACK, WHITE]);
		const samples = [0, 0.25, 0.5, 0.75, 1].map((t) => lightness_(ramp(t)));
		const sorted = [...samples].sort((a, b) => a - b);
		expect(samples).toEqual(sorted);
	});

	test("rejects a ramp with fewer than two stops", () => {
		expect(() => createColorRamp([BLACK])).toThrow(RangeError);
	});
});

suite("sampleRamp", () => {
	test("spaces samples evenly with both ends included", () => {
		const ramp = createColorRamp([BLACK, WHITE]);
		const samples = sampleRamp(ramp, 3);
		expect(samples).toHaveLength(3);
		expect(samples[0]).toEqual(BLACK);
		expect(samples[2]).toEqual(WHITE);
	});

	// Neither end is more representative than the other.
	test("takes the midpoint for a single sample", () => {
		const ramp = createColorRamp([BLACK, WHITE]);
		expect(sampleRamp(ramp, 1)).toEqual([ramp(0.5)]);
	});

	test("rejects a non-positive or fractional count", () => {
		const ramp = createColorRamp([BLACK, WHITE]);
		expect(() => sampleRamp(ramp, 0)).toThrow(RangeError);
		expect(() => sampleRamp(ramp, 1.5)).toThrow(RangeError);
	});
});

suite("rgb8ToOklab/oklabToRgb8", () => {
	test("round-trips an 8-bit colour", () => {
		const color = { r8: 32, g8: 160, b8: 200 };
		expect(oklabToRgb8(rgb8ToOklab(color))).toEqual(color);
	});
});
