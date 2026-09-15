import type { InSpace } from "../brand.js";

// ─── Model coord struct ───────────────────────────────────────────────────────

/**
 * CIE XYZ tristimulus coordinate model.
 *
 * Fully characterises a colour stimulus independently of any observer or
 * device. All values are normalised to Y = 1 for the reference white.
 */
export type XyzCoords = {
	x: number;
	y: number;
	z: number;
};

// ─── White-point parameterisation ────────────────────────────────────────────

/**
 * XYZ normalised white point (Y = 1 by convention).
 *
 * Used as a runtime parameter for chromatic adaptation and Lab↔XYZ conversions.
 * Omits Y because it is always 1 for a normalised white point.
 */
export type XyzNormalized = Omit<XyzCoords, "y">;

/**
 * CIE xyY — chromaticity coordinates + luminance. Used in colorimetry to
 * separate hue/saturation from luminance.
 */
export type XyY = {
	x: number;
	y: number;
	/** Luminance (Y channel). */
	Y: number;
};

// ─── Space-tagged types ───────────────────────────────────────────────────────

/** CIE XYZ relative to the CIE D65 illuminant. */
export type XyzD65 = InSpace<XyzCoords, "xyz-d65">;

/** CIE XYZ relative to the CIE D50 illuminant (ICC PCS). */
export type XyzD50 = InSpace<XyzCoords, "xyz-d50">;
