import { memoize } from "@ac-kit/core";
import {
	Mat3x3,
	mat3x3Invert,
	mat3x3MultiplyCols,
	vec3ApplyMat3,
} from "@ac-kit/math-linear";

import { XyzNormalized } from "../../models/xyz.js";
import { RgbChromaticityCoord } from "./rgb-profiles.js";

export const rgbConversionMatrix = memoize(rgbConversionMatrix_);

function rgbConversionMatrix_(
	chromacityCoord: RgbChromaticityCoord,
	whitePoint: XyzNormalized,
): Mat3x3 {
	const {
		r: { x: xr, y: yr },
		g: { x: xg, y: yg },
		b: { x: xb, y: yb },
	} = chromacityCoord;

	const M: Mat3x3 = [
		[xr / yr, xg / yg, xb / yb],
		[1, 1, 1],
		[(1 - xr - yr) / yr, (1 - xg - yg) / yg, (1 - xb - yb) / yb],
	];

	const S = vec3ApplyMat3([whitePoint.x, 1, whitePoint.z], mat3x3Invert(M));

	return mat3x3MultiplyCols(M, S);
}
