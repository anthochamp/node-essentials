import { InSpace } from "../brand.js";
import { RgbCoords } from "../models/rgb.js";
import { RgbProfile } from "../spaces/rgb/rgb-profiles.js";

/**
 * Converts linear RGB values to RGB values in the range [0, 1] using the
 * specified RGB color space profile.
 *
 * @param value - The linear RGB color in the range [0, 1].
 * @param profile - The RGB color space profile (determines the gamma function).
 * @returns The corresponding RGB color in the range [0, 1].
 */
export function linearRgbToRgb1<SE extends string, SL extends string>(
	value: RgbCoords,
	profile: RgbProfile<SE, SL>,
): InSpace<RgbCoords, SE> {
	const { delinearize } = profile;

	return {
		r: delinearize(value.r),
		g: delinearize(value.g),
		b: delinearize(value.b),
	} as InSpace<RgbCoords, SE>;
}

/**
 * Converts RGB values in the range [0, 1] to linear RGB values using the
 * specified RGB color space profile.
 *
 * @param value - The RGB color in the range [0, 1].
 * @param profile - The RGB color space profile (determines the gamma function).
 * @returns The corresponding linear RGB color in the range [0, 1].
 */
export function rgb1ToLinearRgb<SE extends string, SL extends string>(
	value: RgbCoords,
	profile: RgbProfile<SE, SL>,
): InSpace<RgbCoords, SL> {
	const { linearize } = profile;

	return {
		r: linearize(value.r),
		g: linearize(value.g),
		b: linearize(value.b),
	} as InSpace<RgbCoords, SL>;
}
