import { InSpace } from "../brand.js";
import { LabCoords } from "../models/lab.js";
import { RgbCoords } from "../models/rgb.js";
import { XyzNormalized } from "../models/xyz.js";
import { RgbProfile } from "../spaces/rgb/rgb-profiles.js";
import { labToXyz, xyzToLab } from "./lab-xyz.js";
import { xyzToLinearRgb, linearRgbToXyz } from "./lrgb-xyz.js";
import { xyzTransform } from "./xyz-transform.js";

/**
 * Converts CIE L_a_b* to linear RGB using the specified reference white point
 * and RGB color space.
 *
 * @param value - The CIE L_a_b* color to convert.
 * @param whitePoint - The reference white point of the CIE L_a_b* color.
 * @param rgbProfile - The RGB color space profile of the output linear RGB
 *   color.
 * @returns The corresponding linear RGB color.
 */
export function labToLinearRgb<SE extends string, SL extends string>(
	value: LabCoords,
	whitePoint: XyzNormalized,
	rgbProfile: RgbProfile<SE, SL>,
): InSpace<RgbCoords, SL> {
	return xyzToLinearRgb(
		xyzTransform(
			labToXyz(value, whitePoint),
			whitePoint,
			rgbProfile.whitePoint,
		),
		rgbProfile,
	);
}

/**
 * Converts linear RGB values to CIE L_a_b* using the specified RGB color space
 * profile.
 *
 * @param value - The linear RGB color to convert.
 * @param rgbProfile - The RGB color space profile of the input linear RGB
 *   color.
 * @returns The corresponding CIE L_a_b* color (in the reference white point of
 *   the RGB profile).
 */
export function linearRgbToLab<SE extends string, SL extends string>(
	value: RgbCoords,
	rgbProfile: RgbProfile<SE, SL>,
): LabCoords {
	return xyzToLab(linearRgbToXyz(value, rgbProfile), rgbProfile.whitePoint);
}
