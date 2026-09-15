/**
 * Named perceptual colour schemes, as anchor approximations.
 *
 * Each is a short list of sRGB control points interpolated in OKLab, not the
 * 256-entry lookup table matplotlib and d3 ship. That is a deliberate trade: a
 * few hundred bytes and an auditable diff against a scheme that is within a
 * just-noticeable difference of the original almost everywhere, rather than a
 * bit-exact copy nobody can review. Do not use these to reproduce a published
 * figure exactly.
 *
 * Control points are written as 24-bit sRGB integers — the form every published
 * scheme is quoted in, and small enough that a packed string would buy nothing
 * (see the sibling name table for where packing does pay).
 */

import type { ColorRamp } from "./color-ramp.js";
import { createColorRamp } from "./color-ramp.js";
import { rgb8ToOklab } from "./conversions/rgb8-oklab.js";
import { Rgb8 } from "./encoding/rgb8/rgb8.js";
import { Oklab } from "./spaces/color-spaces.js";

/** Ordered low to high; the natural reading is "more". */
const SEQUENTIAL_STOPS = {
	viridis: [0x440154, 0x414487, 0x2a788e, 0x22a884, 0x7ad151, 0xfde725],
	inferno: [0x000004, 0x420a68, 0x932667, 0xdd513a, 0xfca50a, 0xfcffa4],
	magma: [0x000004, 0x3b0f70, 0x8c2981, 0xde4968, 0xfe9f6d, 0xfcfdbf],
	plasma: [0x0d0887, 0x6a00a8, 0xb12a90, 0xe16462, 0xfca636, 0xf0f921],
	cividis: [0x00224e, 0x123570, 0x3b496c, 0x575d6d, 0x707173, 0xfee838],
	turbo: [0x30123b, 0x4145ab, 0x1ddfa3, 0xa4fc3b, 0xfb8022, 0x7a0403],
	warm: [0x6e40aa, 0xbf3caf, 0xfe4b83, 0xff7847, 0xe2b72f, 0xaff05b],
	cool: [0x6e40aa, 0x417de0, 0x1ac7c2, 0x1ddfa3, 0x52f667, 0xaff05b],
	greys: [0xffffff, 0xd9d9d9, 0xbdbdbd, 0x969696, 0x525252, 0x000000],
	blues: [0xf7fbff, 0xd0e1f2, 0x94c4df, 0x4a98c9, 0x1764ab, 0x08306b],
	greens: [0xf7fcf5, 0xd3eecd, 0x98d594, 0x41ab5d, 0x1b7837, 0x00441b],
	oranges: [0xfff5eb, 0xfdd8b3, 0xfda762, 0xf16913, 0xc44601, 0x7f2704],
	reds: [0xfff5f0, 0xfdccb8, 0xfc8a6a, 0xef3b2c, 0xb91419, 0x67000d],
	purples: [0xfcfbfd, 0xdedded, 0xb0b2d6, 0x8073ac, 0x59309b, 0x3f007d],
	yellowGreenBlue: [0xffffd9, 0xd5eeb3, 0x7fcdbb, 0x2eb0c2, 0x2367ad, 0x081d58],
} as const satisfies Readonly<Record<string, readonly number[]>>;

/** Two-sided, neutral in the middle; the reading is "how far, and which way". */
const DIVERGING_STOPS = {
	redBlue: [0x67001f, 0xd6604d, 0xfddbc7, 0xd1e5f0, 0x4393c3, 0x053061],
	redYellowBlue: [0xa50026, 0xf46d43, 0xfee090, 0xe0f3f8, 0x74add1, 0x313695],
	redYellowGreen: [0xa50026, 0xf46d43, 0xfee08b, 0xd9ef8b, 0x66bd63, 0x006837],
	brownGreen: [0x543005, 0xbf812d, 0xf6e8c3, 0xc7eae5, 0x35978f, 0x003c30],
	purpleGreen: [0x40004b, 0x9970ab, 0xe7d4e8, 0xd9f0d3, 0x5aae61, 0x00441b],
	pinkGreen: [0x8e0152, 0xde77ae, 0xfde0ef, 0xe6f5d0, 0x7fbc41, 0x276419],
	purpleOrange: [0x7f3b08, 0xe08214, 0xfee0b6, 0xd8daeb, 0x8073ac, 0x2d004b],
	blueRed: [0x053061, 0x4393c3, 0xd1e5f0, 0xfddbc7, 0xd6604d, 0x67001f],
	spectral: [0x9e0142, 0xf46d43, 0xfee08b, 0xe6f598, 0x66c2a5, 0x5e4fa2],
} as const satisfies Readonly<Record<string, readonly number[]>>;

export type SequentialRampName = keyof typeof SEQUENTIAL_STOPS;
export type DivergingRampName = keyof typeof DIVERGING_STOPS;
export type RampName = SequentialRampName | DivergingRampName;

/** Splits a 24-bit sRGB integer into its channels. */
function unpackRgb8_(packed: number): Rgb8 {
	return {
		r8: (packed >> 16) & 0xff,
		g8: (packed >> 8) & 0xff,
		b8: packed & 0xff,
	};
}

const ramps = new Map<RampName, ColorRamp>();

function rampStops_(name: RampName): readonly number[] {
	return name in SEQUENTIAL_STOPS
		? SEQUENTIAL_STOPS[name as SequentialRampName]
		: DIVERGING_STOPS[name as DivergingRampName];
}

/**
 * A named scheme as a continuous ramp.
 *
 * Built on first request and kept: the conversion to OKLab is per scheme, not
 * per sample, and a caller colouring a table asks for the same one repeatedly.
 */
export function namedColorRamp(name: RampName): ColorRamp {
	let ramp = ramps.get(name);
	if (ramp === undefined) {
		ramp = createColorRamp(
			rampStops_(name).map((packed) => rgb8ToOklab(unpackRgb8_(packed))),
		);
		ramps.set(name, ramp);
	}
	return ramp;
}

/** Every sequential scheme's name, for a picker or a test. */
export const SEQUENTIAL_RAMP_NAMES = Object.keys(
	SEQUENTIAL_STOPS,
) as readonly SequentialRampName[];

/** Every diverging scheme's name. */
export const DIVERGING_RAMP_NAMES = Object.keys(
	DIVERGING_STOPS,
) as readonly DivergingRampName[];

/**
 * Fixed colour lists for categorical data, where the members have no order.
 *
 * Distinct from a ramp: interpolating between two categories means nothing, and
 * these are chosen to be told apart rather than to read as a progression.
 */
const CATEGORICAL_COLORS = {
	category10: [
		0x1f77b4, 0xff7f0e, 0x2ca02c, 0xd62728, 0x9467bd, 0x8c564b, 0xe377c2,
		0x7f7f7f, 0xbcbd22, 0x17becf,
	],
	tableau10: [
		0x4e79a7, 0xf28e2c, 0xe15759, 0x76b7b2, 0x59a14f, 0xedc949, 0xaf7aa1,
		0xff9da7, 0x9c755f, 0xbab0ab,
	],
	observable10: [
		0x4269d0, 0xefb118, 0xff725c, 0x6cc5b0, 0x3ca951, 0xff8ab7, 0xa463f2,
		0x97bbf5, 0x9c6b4e, 0x9498a0,
	],
	accent: [
		0x7fc97f, 0xbeaed4, 0xfdc086, 0xffff99, 0x386cb0, 0xf0027f, 0xbf5b17,
		0x666666,
	],
	dark2: [
		0x1b9e77, 0xd95f02, 0x7570b3, 0xe7298a, 0x66a61e, 0xe6ab02, 0xa6761d,
		0x666666,
	],
	paired: [
		0xa6cee3, 0x1f78b4, 0xb2df8a, 0x33a02c, 0xfb9a99, 0xe31a1c, 0xfdbf6f,
		0xff7f00, 0xcab2d6, 0x6a3d9a,
	],
	pastel1: [
		0xfbb4ae, 0xb3cde3, 0xccebc5, 0xdecbe4, 0xfed9a6, 0xffffcc, 0xe5d8bd,
		0xfddaec,
	],
	pastel2: [
		0xb3e2cd, 0xfdcdac, 0xcbd5e8, 0xf4cae4, 0xe6f5c9, 0xfff2ae, 0xf1e2cc,
		0xcccccc,
	],
	set1: [
		0xe41a1c, 0x377eb8, 0x4daf4a, 0x984ea3, 0xff7f00, 0xffff33, 0xa65628,
		0xf781bf,
	],
	set2: [
		0x66c2a5, 0xfc8d62, 0x8da0cb, 0xe78ac3, 0xa6d854, 0xffd92f, 0xe5c494,
		0xb3b3b3,
	],
	set3: [
		0x8dd3c7, 0xffffb3, 0xbebada, 0xfb8072, 0x80b1d3, 0xfdb462, 0xb3de69,
		0xfccde5, 0xd9d9d9, 0xbc80bd,
	],
} as const satisfies Readonly<Record<string, readonly number[]>>;

export type CategoricalPaletteName = keyof typeof CATEGORICAL_COLORS;

const palettes = new Map<CategoricalPaletteName, readonly Oklab[]>();

/** A named categorical palette, converted on first request and kept. */
export function categoricalPalette(
	name: CategoricalPaletteName,
): readonly Oklab[] {
	let palette = palettes.get(name);
	if (palette === undefined) {
		palette = CATEGORICAL_COLORS[name].map((packed) =>
			rgb8ToOklab(unpackRgb8_(packed)),
		);
		palettes.set(name, palette);
	}
	return palette;
}

/** Every categorical palette's name. */
export const CATEGORICAL_PALETTE_NAMES = Object.keys(
	CATEGORICAL_COLORS,
) as readonly CategoricalPaletteName[];
