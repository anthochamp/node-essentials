import { InSpace } from "../brand.js";
import { RgbCoords } from "../models/rgb.js";
import { Oklab } from "../spaces/color-spaces.js";
import { RgbProfile } from "../spaces/rgb/rgb-profiles.js";
import { linearRgbToXyz, xyzToLinearRgb } from "./lrgb-xyz.js";
import { xyzToOklab, oklabToXyz } from "./oklab-xyz.js";

/**
 * Converts OKLab values to RGB values in the range [0, 1] using the specified
 * RGB color space profile.
 *
 * @param value - The OKLab color to convert.
 * @param rgbProfile - The target RGB color space profile of the output RGB
 *   color.
 * @returns The corresponding RGB color in the range [0, 1].
 */
export function oklabToLinearRgb<SE extends string, SL extends string>(
	value: Oklab,
	rgbProfile: RgbProfile<SE, SL>,
): InSpace<RgbCoords, SL> {
	return xyzToLinearRgb(oklabToXyz(value, rgbProfile.whitePoint), rgbProfile);
}

/**
 * Converts RGB values in the range [0, 1] to OKLab using the specified RGB
 * color space profile.
 *
 * @param value - The RGB color in the range [0, 1].
 * @param rgbProfile - The RGB color space profile of the input RGB color.
 * @returns The corresponding OKLab color.
 */
export function linearRgbToOklab<SE extends string, SL extends string>(
	value: RgbCoords,
	rgbProfile: RgbProfile<SE, SL>,
): Oklab {
	return xyzToOklab(linearRgbToXyz(value, rgbProfile), rgbProfile.whitePoint);
}
