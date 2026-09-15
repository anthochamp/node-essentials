import { mat3x3Invert, vec3ApplyMat3 } from "@ac-kit/math-linear";

import { InSpace } from "../brand.js";
import { RgbCoords } from "../models/rgb.js";
import { XyzCoords } from "../models/xyz.js";
import { RgbProfile } from "../spaces/rgb/rgb-profiles.js";

/**
 * Converts linear RGB values to CIE XYZ color space using the specified RGB
 * color space profile.
 *
 * @param value - The linear RGB color in the range [0, 1].
 * @param rgbProfile - The RGB color space profile.
 * @returns The corresponding CIE XYZ color.
 */
export function linearRgbToXyz<SE extends string, SL extends string>(
	value: RgbCoords,
	rgbProfile: RgbProfile<SE, SL>,
): XyzCoords {
	const [x, y, z] = vec3ApplyMat3(
		[value.r, value.g, value.b],
		rgbProfile.conversionMatrix,
	);
	return { x, y, z };
}

/**
 * Converts CIE XYZ color space to linear RGB values using the specified RGB
 * color space profile.
 *
 * @param value - The CIE XYZ color.
 * @param rgbProfile - The RGB color space profile.
 * @returns The corresponding linear RGB color in the range [0, 1].
 */
export function xyzToLinearRgb<SE extends string, SL extends string>(
	value: XyzCoords,
	rgbProfile: RgbProfile<SE, SL>,
): InSpace<RgbCoords, SL> {
	const [r, g, b] = vec3ApplyMat3(
		[value.x, value.y, value.z],
		mat3x3Invert(rgbProfile.conversionMatrix),
	);

	return { r, g, b } as InSpace<RgbCoords, SL>;
}
