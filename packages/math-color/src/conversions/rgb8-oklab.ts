import { Rgb8 } from "../encoding/rgb8/rgb8.js";
import { Oklab } from "../spaces/color-spaces.js";
import { RGB_PROFILES } from "../spaces/rgb/rgb-profiles.js";
import { linearRgbToRgb1, rgb1ToLinearRgb } from "./lrgb-rgb1.js";
import { linearRgbToOklab, oklabToLinearRgb } from "./oklab-lrgb.js";
import { rgb1ToRgb8, rgb8ToRgb1 } from "./rgb-rgb8.js";

/**
 * Converts an 8-bit sRGB colour to OKLab.
 *
 * The composition every palette-matching caller needs — 8-bit sRGB is what a
 * terminal, a CSS hex literal and an image pixel all speak, and OKLab is where
 * distances mean something. Assumes sRGB: a colour in another profile has to go
 * through {@link rgb8ToRgb1} and {@link linearRgbToOklab} itself.
 */
export function rgb8ToOklab(color: Rgb8): Oklab {
	return linearRgbToOklab(
		rgb1ToLinearRgb(rgb8ToRgb1(color), RGB_PROFILES.sRGB),
		RGB_PROFILES.sRGB,
	);
}

/**
 * Converts an OKLab colour to 8-bit sRGB.
 *
 * Out-of-gamut values are clamped by {@link rgb1ToRgb8}, which is a silent
 * approximation — map to gamut first when the colour may fall outside sRGB.
 */
export function oklabToRgb8(color: Oklab): Rgb8 {
	return rgb1ToRgb8(
		linearRgbToRgb1(
			oklabToLinearRgb(color, RGB_PROFILES.sRGB),
			RGB_PROFILES.sRGB,
		),
	);
}
