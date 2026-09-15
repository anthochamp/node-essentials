import { LabCoords } from "../models/lab.js";
import { XyzCoords, XyzNormalized } from "../models/xyz.js";

const RATIO_4_OVER_29 = 0.137931034 as const; // 4/29
const RATIO_6_OVER_29 = 0.206896552 as const; // 6/29
const RATIO_6_OVER_29__CUBED = 0.008856452 as const; // (6/29)^3

/**
 * Converts CIE L_a_b* to CIE XYZ using the specified reference white point.
 *
 * @param value - The CIE L_a_b* color to convert.
 * @param whitePoint - The reference white point.
 * @returns The corresponding CIE XYZ color.
 */
export function labToXyz(
	value: LabCoords,
	whitePoint: XyzNormalized,
): XyzCoords {
	const fy = (value.L + 16) / 116;
	const fx = fy + value.a / 500;
	const fz = fy - value.b / 200;

	// The inverse of `f` switches on `t` itself, not on `t³` the way `f` does:
	// comparing against the cubed threshold takes the cube branch for every
	// `t` in (6/29)³..6/29, which is every colour below about L=8.
	function fInv(t: number): number {
		if (t > RATIO_6_OVER_29) {
			return t ** 3;
		}

		// 3 * (6/29)^2 = 0.128418549
		return 0.128418549 * (t - RATIO_4_OVER_29);
	}

	return {
		x: fInv(fx) * whitePoint.x,
		y: fInv(fy),
		z: fInv(fz) * whitePoint.z,
	};
}

/**
 * Converts CIE XYZ to CIE L_a_b* using the specified reference white point.
 *
 * @param value - The CIE XYZ color to convert.
 * @param whitePoint - The reference white point.
 * @returns The corresponding CIE L_a_b* color.
 */
export function xyzToLab(
	value: XyzCoords,
	whitePoint: XyzNormalized,
): LabCoords {
	const x = value.x / whitePoint.x;
	const y = value.y;
	const z = value.z / whitePoint.z;

	function f(t: number): number {
		if (t > RATIO_6_OVER_29__CUBED) {
			return Math.cbrt(t);
		}

		// 1/3 * (6/29)^(-2) = 7.787037037
		return 7.787037037 * t + RATIO_4_OVER_29;
	}

	return {
		L: 116 * f(y) - 16,
		a: 500 * (f(x) - f(y)),
		b: 200 * (f(y) - f(z)),
	};
}
