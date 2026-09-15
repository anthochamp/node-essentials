import { isCloseTo, type IsCloseToOptions } from "@ac-kit/core";
import { diffOfProducts, dotPrecise } from "@ac-kit/math-scalar";

import { Vec3 } from "./vec3.js";

export type Mat3x3 = [
	[number, number, number],
	[number, number, number],
	[number, number, number],
];

export const MAT3X3_ZERO = [
	[0, 0, 0],
	[0, 0, 0],
	[0, 0, 0],
] as const satisfies Mat3x3;
export const MAT3X3_IDENTITY = [
	[1, 0, 0],
	[0, 1, 0],
	[0, 0, 1],
] as const satisfies Mat3x3;

export function mat3x3Add(a: Mat3x3, b: Mat3x3): Mat3x3 {
	return [
		[a[0][0] + b[0][0], a[0][1] + b[0][1], a[0][2] + b[0][2]],
		[a[1][0] + b[1][0], a[1][1] + b[1][1], a[1][2] + b[1][2]],
		[a[2][0] + b[2][0], a[2][1] + b[2][1], a[2][2] + b[2][2]],
	];
}

export function mat3x3Determinant(matrix: Mat3x3): number {
	const [[a, b, c], [d, e, f], [g, h, i]] = matrix;

	return dotPrecise(
		[a, -b, c],
		[
			diffOfProducts(e, i, f, h),
			diffOfProducts(d, i, f, g),
			diffOfProducts(d, h, e, g),
		],
	);
}

/** Exact element-wise equality. See {@link mat3x3IsClose} for a tolerant test. */
export function mat3x3Equals(a: Mat3x3, b: Mat3x3): boolean {
	return (
		a[0][0] === b[0][0] &&
		a[0][1] === b[0][1] &&
		a[0][2] === b[0][2] &&
		a[1][0] === b[1][0] &&
		a[1][1] === b[1][1] &&
		a[1][2] === b[1][2] &&
		a[2][0] === b[2][0] &&
		a[2][1] === b[2][1] &&
		a[2][2] === b[2][2]
	);
}

/**
 * Element-wise approximate equality.
 *
 * Not transitive, so it is not an equality in the sense a `Set` or `Map` needs,
 * and never a basis for ordering — use {@link mat3x3Equals} there.
 */
export function mat3x3IsClose(
	a: Mat3x3,
	b: Mat3x3,
	tolerance: IsCloseToOptions,
): boolean {
	for (let row = 0; row < 3; row++) {
		for (let column = 0; column < 3; column++) {
			if (!isCloseTo(a[row]![column]!, b[row]![column]!, tolerance)) {
				return false;
			}
		}
	}
	return true;
}

/**
 * Creates a 3×3 rotation matrix that rotates around the X axis by the given
 * angle in radians (right-hand rule).
 */
export function mat3x3FromRotationX(angle: number): Mat3x3 {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [
		[1, 0, 0],
		[0, cos, -sin],
		[0, sin, cos],
	];
}

/**
 * Creates a 3×3 rotation matrix that rotates around the Y axis by the given
 * angle in radians (right-hand rule).
 */
export function mat3x3FromRotationY(angle: number): Mat3x3 {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [
		[cos, 0, sin],
		[0, 1, 0],
		[-sin, 0, cos],
	];
}

/**
 * Creates a 3×3 rotation matrix that rotates around the Z axis by the given
 * angle in radians (right-hand rule).
 */
export function mat3x3FromRotationZ(angle: number): Mat3x3 {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [
		[cos, -sin, 0],
		[sin, cos, 0],
		[0, 0, 1],
	];
}

export function mat3x3FromScale(sx: number, sy: number, sz: number): Mat3x3 {
	return [
		[sx, 0, 0],
		[0, sy, 0],
		[0, 0, sz],
	];
}

export function mat3x3Invert(matrix: Mat3x3): Mat3x3 {
	const det = mat3x3Determinant(matrix);
	if (det === 0) {
		throw new Error("Matrix is singular and cannot be inverted.");
	}

	const [[a, b, c], [d, e, f], [g, h, i]] = matrix;

	const adjugate: Mat3x3 = [
		[
			diffOfProducts(e, i, f, h),
			diffOfProducts(c, h, b, i),
			diffOfProducts(b, f, c, e),
		],
		[
			diffOfProducts(f, g, d, i),
			diffOfProducts(a, i, c, g),
			diffOfProducts(c, d, a, f),
		],
		[
			diffOfProducts(d, h, e, g),
			diffOfProducts(b, g, a, h),
			diffOfProducts(a, e, b, d),
		],
	];

	return mat3x3MultiplyScalar(adjugate, 1 / det);
}

export function mat3x3Multiply(a: Mat3x3, b: Mat3x3): Mat3x3 {
	const columns = mat3x3Transpose(b);

	return [
		[
			dotPrecise(a[0], columns[0]),
			dotPrecise(a[0], columns[1]),
			dotPrecise(a[0], columns[2]),
		],
		[
			dotPrecise(a[1], columns[0]),
			dotPrecise(a[1], columns[1]),
			dotPrecise(a[1], columns[2]),
		],
		[
			dotPrecise(a[2], columns[0]),
			dotPrecise(a[2], columns[1]),
			dotPrecise(a[2], columns[2]),
		],
	];
}

export function mat3x3MultiplyCols(matrix: Mat3x3, vector: Vec3): Mat3x3 {
	return [
		[
			matrix[0][0] * vector[0],
			matrix[0][1] * vector[1],
			matrix[0][2] * vector[2],
		],
		[
			matrix[1][0] * vector[0],
			matrix[1][1] * vector[1],
			matrix[1][2] * vector[2],
		],
		[
			matrix[2][0] * vector[0],
			matrix[2][1] * vector[1],
			matrix[2][2] * vector[2],
		],
	];
}

export function mat3x3MultiplyRows(matrix: Mat3x3, vector: Vec3): Mat3x3 {
	return [
		[
			matrix[0][0] * vector[0],
			matrix[0][1] * vector[0],
			matrix[0][2] * vector[0],
		],
		[
			matrix[1][0] * vector[1],
			matrix[1][1] * vector[1],
			matrix[1][2] * vector[1],
		],
		[
			matrix[2][0] * vector[2],
			matrix[2][1] * vector[2],
			matrix[2][2] * vector[2],
		],
	];
}

export function mat3x3MultiplyScalar(matrix: Mat3x3, scalar: number): Mat3x3 {
	return [
		[matrix[0][0] * scalar, matrix[0][1] * scalar, matrix[0][2] * scalar],
		[matrix[1][0] * scalar, matrix[1][1] * scalar, matrix[1][2] * scalar],
		[matrix[2][0] * scalar, matrix[2][1] * scalar, matrix[2][2] * scalar],
	];
}

export function mat3x3Negate(matrix: Mat3x3): Mat3x3 {
	return [
		[-matrix[0][0], -matrix[0][1], -matrix[0][2]],
		[-matrix[1][0], -matrix[1][1], -matrix[1][2]],
		[-matrix[2][0], -matrix[2][1], -matrix[2][2]],
	];
}

export function mat3x3Sub(a: Mat3x3, b: Mat3x3): Mat3x3 {
	return [
		[a[0][0] - b[0][0], a[0][1] - b[0][1], a[0][2] - b[0][2]],
		[a[1][0] - b[1][0], a[1][1] - b[1][1], a[1][2] - b[1][2]],
		[a[2][0] - b[2][0], a[2][1] - b[2][1], a[2][2] - b[2][2]],
	];
}

export function mat3x3Transpose(matrix: Mat3x3): Mat3x3 {
	return [
		[matrix[0][0], matrix[1][0], matrix[2][0]],
		[matrix[0][1], matrix[1][1], matrix[2][1]],
		[matrix[0][2], matrix[1][2], matrix[2][2]],
	];
}
