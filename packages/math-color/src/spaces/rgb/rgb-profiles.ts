import { Mat3x3 } from "@ac-kit/math-linear";

import { ChromaticityCoord } from "../../chromaticity.js";
import {
	CIE_D65_WHITE_POINT,
	ICC_PCS_D50_WHITE_POINT,
} from "../../illuminants.js";
import { XyzNormalized } from "../../models/xyz.js";
import { rgbConversionMatrix } from "./rgb-conversion-matrix.js";

export type RgbProfile<
	SE extends string = string,
	SL extends string = string,
> = {
	/** The gamma-encoded CSS colour-space tag (e.g. `"srgb"`, `"display-p3"`). */
	readonly encodedSpaceTag: SE;
	/**
	 * The linear-light CSS colour-space tag (e.g. `"srgb-linear"`,
	 * `"display-p3-linear"`).
	 */
	readonly linearSpaceTag: SL;

	/**
	 * The white point of the RGB color space.
	 *
	 * This is used for color conversions and defines the reference white for the
	 * color space.
	 */
	whitePoint: XyzNormalized;

	/** The RGB to XYZ conversion matrix for the color space. */
	conversionMatrix: Mat3x3;

	/** The RGB component's linearization function for the color space. */
	linearize: (t: number) => number;

	/** The RGB component's delinearization function for the color space. */
	delinearize: (t: number) => number;
};

function srgbInvGamma_(t: number): number {
	return t <= 0.04045 ? t / 12.92 : Math.pow((t + 0.055) / 1.055, 2.4);
}

function srgbGamma_(t: number): number {
	return t <= 0.0031308 ? t * 12.92 : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
}

/**
 * Identifier for the five RGB colour spaces supported by {@link RgbProfile}.
 * These keys index {@link RGB_PROFILES}.
 */
export type RgbSpaceId =
	| "sRGB"
	| "AdobeRGB"
	| "DisplayP3"
	| "ProPhotoRGB"
	| "Rec2020";

export type RgbChromaticityCoord = {
	r: ChromaticityCoord;
	g: ChromaticityCoord;
	b: ChromaticityCoord;
};

/**
 * Primary chromaticities as published by each colour space's defining
 * specification. These are specification constants, not measurements: a value
 * here that disagrees with the spec silently skews every conversion through
 * XYZ, and only for chromatic colours — the white-point normalisation in
 * {@link rgbConversionMatrix} keeps neutrals correct either way, so the error
 * hides. `rgb-profiles.test.ts` pins each one.
 */
export const RGB_CHROMATICITY_COORDS = {
	/** Adobe RGB (1998), §4.3.4.1. */
	AdobeRGB: {
		r: { x: 0.64, y: 0.33 },
		g: { x: 0.21, y: 0.71 },
		b: { x: 0.15, y: 0.06 },
	},
	/** Display P3: DCI-P3 primaries, D65 white, sRGB transfer curve. */
	DisplayP3: {
		r: { x: 0.68, y: 0.32 },
		g: { x: 0.265, y: 0.69 },
		b: { x: 0.15, y: 0.06 },
	},
	/** IEC 61966-2-1:1999, shared with ITU-R BT.709. */
	sRGB: {
		r: { x: 0.64, y: 0.33 },
		g: { x: 0.3, y: 0.6 },
		b: { x: 0.15, y: 0.06 },
	},
	/** ROMM RGB, ISO 22028-2. */
	ProPhotoRGB: {
		r: { x: 0.7347, y: 0.2653 },
		g: { x: 0.1596, y: 0.8404 },
		b: { x: 0.0366, y: 0.0001 },
	},
	/** ITU-R BT.2020. */
	Rec2020: {
		r: { x: 0.708, y: 0.292 },
		g: { x: 0.17, y: 0.797 },
		b: { x: 0.131, y: 0.046 },
	},
} as const satisfies Record<RgbSpaceId, RgbChromaticityCoord>;

export const RGB_WHITE_POINTS = {
	AdobeRGB: CIE_D65_WHITE_POINT,
	DisplayP3: CIE_D65_WHITE_POINT,
	sRGB: CIE_D65_WHITE_POINT,
	ProPhotoRGB: ICC_PCS_D50_WHITE_POINT,
	Rec2020: CIE_D65_WHITE_POINT,
} as const satisfies Record<RgbSpaceId, XyzNormalized>;

export const RGB_PROFILES = {
	sRGB: {
		encodedSpaceTag: "srgb",
		linearSpaceTag: "srgb-linear",
		whitePoint: RGB_WHITE_POINTS.sRGB,
		conversionMatrix: rgbConversionMatrix(
			RGB_CHROMATICITY_COORDS.sRGB,
			RGB_WHITE_POINTS.sRGB,
		),
		linearize: srgbInvGamma_,
		delinearize: srgbGamma_,
	},
	AdobeRGB: {
		encodedSpaceTag: "a98-rgb",
		linearSpaceTag: "a98-rgb-linear",
		whitePoint: RGB_WHITE_POINTS.AdobeRGB,
		conversionMatrix: rgbConversionMatrix(
			RGB_CHROMATICITY_COORDS.AdobeRGB,
			RGB_WHITE_POINTS.AdobeRGB,
		),
		linearize: (t: number) => t ** 2.19921875,
		delinearize: (t: number) => Math.pow(t, 1 / 2.19921875),
	},
	DisplayP3: {
		encodedSpaceTag: "display-p3",
		linearSpaceTag: "display-p3-linear",
		whitePoint: RGB_WHITE_POINTS.DisplayP3,
		conversionMatrix: rgbConversionMatrix(
			RGB_CHROMATICITY_COORDS.DisplayP3,
			RGB_WHITE_POINTS.DisplayP3,
		),
		linearize: srgbInvGamma_, // Display P3 uses the same gamma as sRGB
		delinearize: srgbGamma_, // Display P3 uses the same gamma as sRGB
	},
	ProPhotoRGB: {
		encodedSpaceTag: "prophoto-rgb",
		linearSpaceTag: "prophoto-rgb-linear",
		whitePoint: RGB_WHITE_POINTS.ProPhotoRGB,
		conversionMatrix: rgbConversionMatrix(
			RGB_CHROMATICITY_COORDS.ProPhotoRGB,
			RGB_WHITE_POINTS.ProPhotoRGB,
		),
		linearize: (t: number) => t ** 1.8,
		delinearize: (t: number) => Math.pow(t, 1 / 1.8),
	},
	Rec2020: {
		encodedSpaceTag: "rec2020",
		linearSpaceTag: "rec2020-linear",
		whitePoint: RGB_WHITE_POINTS.Rec2020,
		conversionMatrix: rgbConversionMatrix(
			RGB_CHROMATICITY_COORDS.Rec2020,
			RGB_WHITE_POINTS.Rec2020,
		),
		linearize: srgbInvGamma_, // Rec. 2020 uses the same gamma as sRGB
		delinearize: srgbGamma_, // Rec. 2020 uses the same gamma as sRGB
	},
} as const satisfies Record<RgbSpaceId, RgbProfile>;
