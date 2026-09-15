import {
	Mat3x3,
	MAT3X3_IDENTITY,
	mat3x3Invert,
	mat3x3Multiply,
	vec3ApplyMat3,
} from "@ac-kit/math-linear";

import { XyzCoords, XyzNormalized } from "../models/xyz.js";

export type CatMethod = "Bradford" | "VonKries" | "XYZScaling";

const CONE_MATRICES_ = {
	Bradford: [
		[0.8951, 0.2664, -0.1614],
		[-0.7502, 1.7135, 0.0367],
		[0.0389, -0.0685, 1.0296],
	],
	VonKries: [
		[0.40024, 0.7076, -0.08081],
		[-0.2263, 1.16532, 0.0457],
		[0.0, 0.0, 0.91822],
	],

	XYZScaling: MAT3X3_IDENTITY,
} as const satisfies Record<CatMethod, Mat3x3>;

/**
 * Computes a 3×3 chromatic adaptation transform (CAT) matrix from one white
 * point to another using the specified cone-response method (default:
 * Bradford).
 *
 * The resulting matrix can be applied directly to XYZ values to adapt them from
 * the `from` white point to the `to` white point.
 */
export function computeCatMatrix(
	from: XyzNormalized,
	to: XyzNormalized,
	method: CatMethod = "Bradford",
): Mat3x3 {
	const M = CONE_MATRICES_[method];
	const M_inv = mat3x3Invert(M);

	const src = vec3ApplyMat3([from.x, 1, from.z], M);
	const dst = vec3ApplyMat3([to.x, 1, to.z], M);

	// Diagonal matrix: scale each cone channel by dst/src
	const D: Mat3x3 = [
		[dst[0] / src[0], 0, 0],
		[0, dst[1] / src[1], 0],
		[0, 0, dst[2] / src[2]],
	];

	// CAT = M⁻¹ × D × M
	return mat3x3Multiply(M_inv, mat3x3Multiply(D, M));
}

/**
 * Adapts an XYZ color from one white point to another.
 *
 * @param value - The XYZ color to adapt.
 * @param from - The source white point.
 * @param to - The destination white point.
 * @param method - The cone-response model to use (default: Bradford).
 */
export function xyzTransform(
	value: XyzCoords,
	from: XyzNormalized,
	to: XyzNormalized,
	method: CatMethod = "Bradford",
): XyzCoords {
	if (from.x === to.x && from.z === to.z) {
		return value;
	}

	const cat = computeCatMatrix(from, to, method);
	const [x, y, z] = vec3ApplyMat3([value.x, value.y, value.z], cat);
	return { x, y, z };
}
