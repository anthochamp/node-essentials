import { labToLinearRgb } from "./conversions/lab-lrgb.js";
import { rgbIsInGamut } from "./models/rgb.js";
import { XyzNormalized } from "./models/xyz.js";
import { LabD50 } from "./spaces/color-spaces.js";
import { RgbProfile } from "./spaces/rgb/rgb-profiles.js";

/**
 * Test if a CIE L_a_b* color is in gamut for the given RGB profile.
 *
 * @param lab - The CIE L\_a\_b\* color to test.
 * @param whitePoint - The reference white point of the CIE L\_a\_b\* color.
 * @param rgbProfile - The RGB color space profile to test against.
 * @returns `true` if the color is in gamut, `false` otherwise.
 */
export function labIsInGamut(
	lab: LabD50,
	whitePoint: XyzNormalized,
	rgbProfile: RgbProfile,
): boolean {
	return rgbIsInGamut(labToLinearRgb(lab, whitePoint, rgbProfile));
}
