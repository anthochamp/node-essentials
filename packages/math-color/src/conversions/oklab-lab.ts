import { OKLAB_WHITE_POINT } from "../illuminants.js";
import { XyzNormalized } from "../models/xyz.js";
import { Oklab, LabD50 } from "../spaces/color-spaces.js";
import { labToXyz, xyzToLab } from "./lab-xyz.js";
import { oklabToXyz, xyzToOklab } from "./oklab-xyz.js";

/**
 * Converts OKLab to CIE L_a_b* values using the specified white point.
 *
 * @param value - The OKLab color.
 * @param whitePoint - The reference white point of the L_a_b* color.
 * @returns The corresponding CIE L_a_b* color.
 */
export function oklabToLab(value: Oklab): LabD50 {
	return xyzToLab(
		oklabToXyz(value, OKLAB_WHITE_POINT),
		OKLAB_WHITE_POINT,
	) as LabD50;
}

/**
 * Converts CIE L_a_b* values to OKLab using the specified white point.
 *
 * @param value - The CIE L_a_b* color.
 * @param whitePoint - The reference white point of the L_a_b* color.
 * @returns The corresponding OKLab color.
 */
export function labToOklab(value: LabD50, whitePoint: XyzNormalized): Oklab {
	return xyzToOklab(labToXyz(value, whitePoint), whitePoint);
}
