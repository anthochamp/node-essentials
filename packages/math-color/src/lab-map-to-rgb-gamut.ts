import { labToLch, lchToLab } from "./conversions/lab-lch.js";
import { labIsInGamut } from "./lab-is-in-rgb-gamut.js";
import { XyzNormalized } from "./models/xyz.js";
import { LabD50, LchD50 } from "./spaces/color-spaces.js";
import { RgbProfile } from "./spaces/rgb/rgb-profiles.js";

/**
 * Convergence threshold used in the CSS Color Level 4 gamut-mapping binary
 * search.
 *
 * @see https://www.w3.org/TR/css-color-4/#css-gamut-mapping
 */
const GAMUT_MAPPING_EPSILON = 0.000075;

/**
 * Maps a CIE L_a_b* color into the gamut of the given RGB profile using the CSS
 * Color Level 4 chroma-reduction method: binary search on C* while preserving
 * L* and h°.
 *
 * If the color is already in gamut it is returned unchanged. If C* ≤ 0
 * (achromatic), the input is returned as-is (per-channel clamping is the
 * correct fallback in that case).
 *
 * @param lab - The CIE L\_a\_b\* color to map into gamut.
 * @param whitePoint - The reference white point of the CIE L\_a\_b\* color.
 * @param rgbProfile - The target RGB color space profile.
 * @returns A CIE L_a_b* color guaranteed to map to a linear RGB value within
 *   [0, 1] per channel.
 */
export function labMapToGamut(
	lab: LabD50,
	whitePoint: XyzNormalized,
	rgbProfile: RgbProfile,
): LabD50 {
	if (labIsInGamut(lab, whitePoint, rgbProfile)) {
		return lab;
	}

	const lch = labToLch(lab);

	if (lch.C <= 0) {
		return lab;
	}

	let low = 0;
	let high = lch.C;

	while (high - low > GAMUT_MAPPING_EPSILON) {
		const mid = (low + high) / 2;
		const candidate = lchToLab({ L: lch.L, C: mid, h: lch.h } as LchD50);

		if (labIsInGamut(candidate, whitePoint, rgbProfile)) {
			low = mid;
		} else {
			high = mid;
		}
	}

	return lchToLab({ L: lch.L, C: low, h: lch.h } as LchD50);
}
