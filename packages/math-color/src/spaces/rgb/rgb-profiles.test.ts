import { describe, expect, it } from "vitest";

import { linearRgbToXyz } from "../../conversions/lrgb-xyz.js";
import { rgb8ToOklab } from "../../conversions/rgb8-oklab.js";
import type { RgbSpaceId } from "./rgb-profiles.js";
import { RGB_CHROMATICITY_COORDS, RGB_PROFILES } from "./rgb-profiles.js";

/**
 * These are specification constants checked against their defining documents,
 * not against another implementation in this repository — a second statement of
 * the same numbers would agree with itself while both were wrong, which is
 * exactly how the sRGB primaries came to be Adobe RGB's for a while.
 *
 * The white-point normalisation inside `rgbConversionMatrix` forces white to
 * land correctly whatever the primaries are, so a round-trip on neutrals cannot
 * catch a wrong primary. Only the chromatic values below can.
 */

/** Published primary chromaticities, per space. */
const PUBLISHED_PRIMARIES: Record<
	RgbSpaceId,
	{ r: [number, number]; g: [number, number]; b: [number, number] }
> = {
	// IEC 61966-2-1:1999 / ITU-R BT.709.
	sRGB: { r: [0.64, 0.33], g: [0.3, 0.6], b: [0.15, 0.06] },
	// Adobe RGB (1998) §4.3.4.1.
	AdobeRGB: { r: [0.64, 0.33], g: [0.21, 0.71], b: [0.15, 0.06] },
	// SMPTE RP 431-2 (DCI-P3) primaries, as used by Display P3.
	DisplayP3: { r: [0.68, 0.32], g: [0.265, 0.69], b: [0.15, 0.06] },
	// ROMM RGB, ISO 22028-2.
	ProPhotoRGB: {
		r: [0.7347, 0.2653],
		g: [0.1596, 0.8404],
		b: [0.0366, 0.0001],
	},
	// ITU-R BT.2020.
	Rec2020: { r: [0.708, 0.292], g: [0.17, 0.797], b: [0.131, 0.046] },
};

/**
 * Published linear-RGB → XYZ matrices.
 *
 * Reproduced to within `MATRIX_TOLERANCE` rather than exactly: the published
 * tables round the illuminant to four decimals (D65 as `0.3127, 0.3290`) while
 * `illuminants.ts` carries the five-decimal CIE 15:2004 values, and that
 * difference propagates into the fourth decimal of the matrix.
 */
const PUBLISHED_MATRICES: Record<RgbSpaceId, readonly (readonly number[])[]> = {
	sRGB: [
		[0.4124564, 0.3575761, 0.1804375],
		[0.2126729, 0.7151522, 0.072175],
		[0.0193339, 0.119192, 0.9503041],
	],
	AdobeRGB: [
		[0.5767309, 0.185554, 0.1881852],
		[0.2973769, 0.6273491, 0.0752741],
		[0.0270343, 0.0706872, 0.9911085],
	],
	DisplayP3: [
		[0.4865709, 0.2656677, 0.1982173],
		[0.2289746, 0.6917385, 0.0792869],
		[0.0, 0.0451134, 1.0439444],
	],
	ProPhotoRGB: [
		[0.7976749, 0.1351917, 0.0313534],
		[0.2880402, 0.7118741, 0.0000599],
		[0.0, 0.0, 0.82521],
	],
	Rec2020: [
		[0.636958, 0.1446169, 0.168881],
		[0.2627002, 0.6779981, 0.0593017],
		[0.0, 0.0280727, 1.0609851],
	],
};

const MATRIX_TOLERANCE = 5e-4;

const SPACE_IDS = Object.keys(PUBLISHED_PRIMARIES) as RgbSpaceId[];

describe("RGB_CHROMATICITY_COORDS", () => {
	it.each(SPACE_IDS)("%s matches its published primaries", (id) => {
		const published = PUBLISHED_PRIMARIES[id];
		const actual = RGB_CHROMATICITY_COORDS[id];

		expect([actual.r.x, actual.r.y]).toEqual(published.r);
		expect([actual.g.x, actual.g.y]).toEqual(published.g);
		expect([actual.b.x, actual.b.y]).toEqual(published.b);
	});

	it("gives sRGB and Adobe RGB the same red and blue but different green", () => {
		// Their red and blue genuinely coincide, which is what made a copy-paste
		// of all three plausible enough to survive.
		expect(RGB_CHROMATICITY_COORDS.sRGB.r).toEqual(
			RGB_CHROMATICITY_COORDS.AdobeRGB.r,
		);
		expect(RGB_CHROMATICITY_COORDS.sRGB.b).toEqual(
			RGB_CHROMATICITY_COORDS.AdobeRGB.b,
		);
		expect(RGB_CHROMATICITY_COORDS.sRGB.g).not.toEqual(
			RGB_CHROMATICITY_COORDS.AdobeRGB.g,
		);
	});
});

describe("RGB_PROFILES conversion matrices", () => {
	it.each(SPACE_IDS)("%s reproduces its published matrix", (id) => {
		const published = PUBLISHED_MATRICES[id];
		const actual = RGB_PROFILES[id].conversionMatrix;

		for (let row = 0; row < 3; row++) {
			for (let column = 0; column < 3; column++) {
				expect(
					Math.abs(actual[row]![column]! - published[row]![column]!),
				).toBeLessThanOrEqual(MATRIX_TOLERANCE);
			}
		}
	});

	it.each(SPACE_IDS)("%s maps linear white to its own white point", (id) => {
		const profile = RGB_PROFILES[id];
		const white = linearRgbToXyz({ r: 1, g: 1, b: 1 }, profile);

		expect(white.x).toBeCloseTo(profile.whitePoint.x, 12);
		expect(white.y).toBeCloseTo(1, 12);
		expect(white.z).toBeCloseTo(profile.whitePoint.z, 12);
	});
});

/**
 * Ottosson's own worked values for OKLab (bottosson.github.io/posts/oklab). The
 * one check here that a wrong primary cannot pass: white is fixed by
 * construction, the three saturated corners are not.
 */
describe("rgb8ToOklab against Ottosson's reference values", () => {
	const CASES = [
		{ name: "white", rgb: [255, 255, 255], lab: [1, 0, 0] },
		{ name: "black", rgb: [0, 0, 0], lab: [0, 0, 0] },
		{ name: "red", rgb: [255, 0, 0], lab: [0.627955, 0.224863, 0.125846] },
		{ name: "green", rgb: [0, 255, 0], lab: [0.86644, -0.233888, 0.179498] },
		{ name: "blue", rgb: [0, 0, 255], lab: [0.452014, -0.032457, -0.311528] },
	] as const;

	it.each(CASES)("$name", ({ rgb, lab }) => {
		const actual = rgb8ToOklab({ r8: rgb[0], g8: rgb[1], b8: rgb[2] });

		expect(actual.L).toBeCloseTo(lab[0], 3);
		expect(actual.a).toBeCloseTo(lab[1], 3);
		expect(actual.b).toBeCloseTo(lab[2], 3);
	});
});
