import { clamp } from "@ac-kit/core";
import { vec3Lerp } from "@ac-kit/math-linear";

/**
 * RGB coordinate model — red, green, and blue channels.
 *
 * Values have no intrinsic range or space; those are determined by the
 * {@link InSpace} brand applied on top.
 */
export type RgbCoords = {
	r: number;
	g: number;
	b: number;
};

/**
 * Clamps each channel of an {@link RgbCoords} to the normalised range [0, 1].
 *
 * The caller is responsible for ensuring the input uses the [0, 1] convention
 * (gamma-encoded or linear-light). Achromatic clipping can shift hue for
 * out-of-gamut colours; use gamut mapping (lab-map-to-gamut) when that
 * matters.
 */
export function rgbClamp(v: RgbCoords): RgbCoords {
	return { r: clamp(v.r, 0, 1), g: clamp(v.g, 0, 1), b: clamp(v.b, 0, 1) };
}

/**
 * Linearly interpolates between two {@link RgbCoords} values.
 *
 * Operates in whatever colour space the caller provides (linear or gamma). For
 * physically correct blending pass linear-light values.
 *
 * @param a - Start colour (t = 0).
 * @param b - End colour (t = 1).
 * @param t - Interpolation factor in [0, 1].
 */
export function rgbMix(a: RgbCoords, b: RgbCoords, t: number): RgbCoords {
	const [r, g, bb] = vec3Lerp([a.r, a.g, a.b], [b.r, b.g, b.b], t);
	return { r, g, b: bb };
}

/**
 * Returns `true` if all channels of the given {@link RgbCoords} are within [0,
 * 1].
 */
export function rgbIsInGamut(v: RgbCoords): boolean {
	return v.r >= 0 && v.r <= 1 && v.g >= 0 && v.g <= 1 && v.b >= 0 && v.b <= 1;
}
