import { Mat3x3, mat3x3Multiply, vec3ApplyMat3 } from "@ac-kit/math-linear";

import { CIE_D65_WHITE_POINT } from "../illuminants.js";
import { XyzCoords, XyzNormalized } from "../models/xyz.js";
import { Oklab } from "../spaces/color-spaces.js";
import { computeCatMatrix } from "./xyz-transform.js";

// OKLab M1: XYZ (D65) → LMS
// Source: https://bottosson.github.io/posts/oklab/
const M1_ = [
	[0.8189330101, 0.3618667424, -0.1288597137],
	[0.0329845436, 0.9293118715, 0.0361456387],
	[0.0482003018, 0.2643662691, 0.633851707],
] as const satisfies Mat3x3;

// OKLab M2: ∛LMS → OKLab
const M2_ = [
	[0.2104542553, 0.793617785, -0.0040720468],
	[1.9779984951, -2.428592205, 0.4505937099],
	[0.0259040371, 0.7827717662, -0.808675766],
] as const satisfies Mat3x3;

// Inverse of M1: LMS → XYZ (D65)
const M1_INV_ = [
	[1.2270138511035211, -0.5577999806518222, 0.2812561489664678],
	[-0.0405801784232806, 1.1122568696168302, -0.0716766786656012],
	[-0.0763812845057069, -0.4214819784180127, 1.5861632204407947],
] as const satisfies Mat3x3;

// Inverse of M2: OKLab → ∛LMS
const M2_INV_ = [
	[1.0, 0.3963377774, 0.2158037573],
	[1.0, -0.1055613458, -0.0638541728],
	[1.0, -0.0894841775, -1.291485548],
] as const satisfies Mat3x3;

/**
 * Converts CIE XYZ to OKLab using the specified reference white points.
 *
 * @param value - The XYZ color to convert.
 * @param whitePoint - The reference white point of the input XYZ color.
 * @returns The corresponding OKLab color.
 */
export function xyzToOklab(value: XyzCoords, whitePoint: XyzNormalized): Oklab {
	const m1 =
		whitePoint.x === CIE_D65_WHITE_POINT.x &&
		whitePoint.z === CIE_D65_WHITE_POINT.z
			? M1_
			: mat3x3Multiply(M1_, computeCatMatrix(whitePoint, CIE_D65_WHITE_POINT));

	const [l, m, s] = vec3ApplyMat3([value.x, value.y, value.z], m1);
	const [L, a, b] = vec3ApplyMat3(
		[Math.cbrt(l), Math.cbrt(m), Math.cbrt(s)],
		M2_,
	);
	return { L, a, b } as Oklab;
}

/**
 * Converts an OKLab color to CIE XYZ using the specified reference white
 * points.
 *
 * @param oklab - The OKLab color to convert.
 * @param whitePoint - The reference white point of the output XYZ color.
 * @returns The corresponding CIE XYZ color.
 */
export function oklabToXyz(oklab: Oklab, whitePoint: XyzNormalized): XyzCoords {
	const [l_, m_, s_] = vec3ApplyMat3([oklab.L, oklab.a, oklab.b], M2_INV_);

	const m1inv =
		whitePoint.x === CIE_D65_WHITE_POINT.x &&
		whitePoint.z === CIE_D65_WHITE_POINT.z
			? M1_INV_
			: mat3x3Multiply(
					computeCatMatrix(CIE_D65_WHITE_POINT, whitePoint),
					M1_INV_,
				);

	const [x, y, z] = vec3ApplyMat3([l_ ** 3, m_ ** 3, s_ ** 3], m1inv);
	return { x, y, z };
}
