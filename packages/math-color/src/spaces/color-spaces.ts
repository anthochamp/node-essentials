import { InSpace } from "../brand.js";
import { HslCoords } from "../models/hsl.js";
import { LabCoords } from "../models/lab.js";
import { LchCoords } from "../models/lch.js";
import { RgbCoords } from "../models/rgb.js";

/**
 * OKLab colour space (Ottosson 2020). Perceptually uniform with good hue
 * linearity.
 *
 * White point: D65 (fixed). L ∈ [0, 1], a/b ∈ [~−0.5, ~0.5].
 */
export type Oklab = InSpace<LabCoords, "oklab">;

export const OKLAB_GREY = { L: 0.5, a: 0, b: 0 } as Oklab;

/**
 * CIE L_a_b* relative to the D50 illuminant (ICC PCS default).
 *
 * L ∈ [0, 100], a ∈ [−128, 127], b ∈ [−128, 127].
 */
export type LabD50 = InSpace<LabCoords, "lab-d50">;

/**
 * CIE L_a_b* relative to the D65 illuminant.
 *
 * L ∈ [0, 100], a ∈ [−128, 127], b ∈ [−128, 127].
 */
export type LabD65 = InSpace<LabCoords, "lab-d65">;

/**
 * OKLch — cylindrical representation of {@link Oklab}.
 *
 * White point: D65 (fixed). L ∈ [0, 1], C ∈ [0, ~0.4], h ∈ [0, 360).
 */
export type Oklch = InSpace<LchCoords, "oklab">;

/**
 * CIE L_C_h° relative to the D50 illuminant.
 *
 * L ∈ [0, 100], C ∈ [0, ~150], h ∈ [0, 360).
 */
export type LchD50 = InSpace<LchCoords, "lab-d50">;

/**
 * CIE L_C_h° relative to the D65 illuminant.
 *
 * L ∈ [0, 100], C ∈ [0, ~150], h ∈ [0, 360).
 */
export type LchD65 = InSpace<LchCoords, "lab-d65">;

/** Gamma-encoded sRGB, range [0, 1]. CSS: `srgb`. */
export type Srgb = InSpace<RgbCoords, "srgb">;

/** Linear-light sRGB, range [0, 1]. CSS: `srgb-linear`. */
export type SrgbLinear = InSpace<RgbCoords, "srgb-linear">;

/** Gamma-encoded Display P3, range [0, 1]. CSS: `display-p3`. */
export type DisplayP3 = InSpace<RgbCoords, "display-p3">;

/** Linear-light Display P3, range [0, 1]. CSS: `display-p3-linear`. */
export type DisplayP3Linear = InSpace<RgbCoords, "display-p3-linear">;

/** Gamma-encoded Adobe RGB 98, range [0, 1]. CSS: `a98-rgb`. */
export type AdobeRgb = InSpace<RgbCoords, "a98-rgb">;

/** Linear-light Adobe RGB 98, range [0, 1]. CSS: `a98-rgb-linear`. */
export type AdobeRgbLinear = InSpace<RgbCoords, "a98-rgb-linear">;

/** Gamma-encoded ProPhoto RGB, range [0, 1]. CSS: `prophoto-rgb`. */
export type ProPhotoRgb = InSpace<RgbCoords, "prophoto-rgb">;

/** Linear-light ProPhoto RGB, range [0, 1]. CSS: `prophoto-rgb-linear`. */
export type ProPhotoRgbLinear = InSpace<RgbCoords, "prophoto-rgb-linear">;

/** Gamma-encoded Rec. 2020, range [0, 1]. CSS: `rec2020`. */
export type Rec2020 = InSpace<RgbCoords, "rec2020">;

/** Linear-light Rec. 2020, range [0, 1]. CSS: `rec2020-linear`. */
export type Rec2020Linear = InSpace<RgbCoords, "rec2020-linear">;

/**
 * HSL derived from sRGB — the de-facto standard interpretation.
 *
 * The conversion {@link hslToRgb1} / {@link rgb1ToHsl} is the canonical mapping
 * and assumes sRGB primaries.
 */
export type Hsl = InSpace<HslCoords, "srgb">;
