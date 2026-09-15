import {
	CylindricalCoordsZ,
	cylindricalZToVec3,
	vec3ToCylindricalZ,
} from "@ac-kit/math-geometry";
import { DEG_TO_RAD, RAD_TO_DEG } from "@ac-kit/math-scalar";

import { InSpace } from "../brand.js";
import { LabCoords } from "../models/lab.js";
import { LchCoords } from "../models/lch.js";

/**
 * Converts any Lab-family colour (CIE L_a_b* or OKLab) to its cylindrical LCH
 * representation, preserving the correct paired space brand.
 *
 * Note: h is undefined for achromatic colours (a = 0, b = 0 => C = 0). Returns
 * h = 0 in that case, consistent with CIE convention.
 */
export function labToLch<S extends string>(
	value: InSpace<LabCoords, S>,
): InSpace<LchCoords, S> {
	const {
		radius: C,
		azimuth,
		height: L,
	} = vec3ToCylindricalZ([value.a, value.b, value.L]);

	const hDeg = azimuth * RAD_TO_DEG;
	return { L, C, h: hDeg < 0 ? hDeg + 360 : hDeg } as InSpace<LchCoords, S>;
}

/**
 * Converts any LCH-family colour (CIE L_C_h degrees or OKLch) back to its
 * Cartesian Lab representation, preserving the correct paired space brand.
 */
export function lchToLab<S extends string>(
	value: InSpace<LchCoords, S>,
): InSpace<LabCoords, S> {
	const [a, b, L] = cylindricalZToVec3({
		radius: value.C,
		azimuth: value.h * DEG_TO_RAD,
		height: value.L,
	} as CylindricalCoordsZ);

	return { L, a, b } as InSpace<LabCoords, S>;
}
