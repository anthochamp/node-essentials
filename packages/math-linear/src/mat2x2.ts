import { isCloseTo, type IsCloseToOptions } from "@ac-kit/core";
import { diffOfProducts } from "@ac-kit/math-scalar";

import { Vec2 } from "./vec2.js";

export type Mat2x2 = [[number, number], [number, number]];

export const MAT2X2_ZERO = [
	[0, 0],
	[0, 0],
] as const satisfies Mat2x2;
export const MAT2X2_IDENTITY = [
	[1, 0],
	[0, 1],
] as const satisfies Mat2x2;

export function mat2x2Add(a: Mat2x2, b: Mat2x2): Mat2x2 {
	return [
		[a[0][0] + b[0][0], a[0][1] + b[0][1]],
		[a[1][0] + b[1][0], a[1][1] + b[1][1]],
	];
}

export function mat2x2MultiplyScalar(matrix: Mat2x2, scalar: number): Mat2x2 {
	return [
		[matrix[0][0] * scalar, matrix[0][1] * scalar],
		[matrix[1][0] * scalar, matrix[1][1] * scalar],
	];
}

export function mat2x2MultiplyCols(matrix: Mat2x2, vector: Vec2): Mat2x2 {
	return [
		[matrix[0][0] * vector[0]!, matrix[0][1] * vector[1]!],
		[matrix[1][0] * vector[0]!, matrix[1][1] * vector[1]!],
	];
}

export function mat2x2MultiplyRows(matrix: Mat2x2, vector: Vec2): Mat2x2 {
	return [
		[matrix[0][0] * vector[0]!, matrix[0][1] * vector[0]!],
		[matrix[1][0] * vector[1]!, matrix[1][1] * vector[1]!],
	];
}

export function mat2x2Multiply(a: Mat2x2, b: Mat2x2): Mat2x2 {
	return [
		[
			a[0][0] * b[0][0] + a[0][1] * b[1][0],
			a[0][0] * b[0][1] + a[0][1] * b[1][1],
		],
		[
			a[1][0] * b[0][0] + a[1][1] * b[1][0],
			a[1][0] * b[0][1] + a[1][1] * b[1][1],
		],
	];
}

export function mat2x2Transpose(matrix: Mat2x2): Mat2x2 {
	return [
		[matrix[0][0], matrix[1][0]],
		[matrix[0][1], matrix[1][1]],
	];
}

export function mat2x2Determinant(matrix: Mat2x2): number {
	return diffOfProducts(matrix[0][0], matrix[1][1], matrix[0][1], matrix[1][0]);
}

/** Exact element-wise equality. See {@link mat2x2IsClose} for a tolerant test. */
export function mat2x2Equals(a: Mat2x2, b: Mat2x2): boolean {
	return (
		a[0][0] === b[0][0] &&
		a[0][1] === b[0][1] &&
		a[1][0] === b[1][0] &&
		a[1][1] === b[1][1]
	);
}

/**
 * Element-wise approximate equality.
 *
 * Not transitive, so it is not an equality in the sense a `Set` or `Map` needs,
 * and never a basis for ordering — use {@link mat2x2Equals} there.
 */
export function mat2x2IsClose(
	a: Mat2x2,
	b: Mat2x2,
	tolerance: IsCloseToOptions,
): boolean {
	return (
		isCloseTo(a[0][0], b[0][0], tolerance) &&
		isCloseTo(a[0][1], b[0][1], tolerance) &&
		isCloseTo(a[1][0], b[1][0], tolerance) &&
		isCloseTo(a[1][1], b[1][1], tolerance)
	);
}

/**
 * Creates a 2×2 rotation matrix for the given angle in radians
 * (counter-clockwise).
 */
export function mat2x2FromRotation(angle: number): Mat2x2 {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [
		[cos, -sin],
		[sin, cos],
	];
}

export function mat2x2Invert(matrix: Mat2x2): Mat2x2 {
	const det = mat2x2Determinant(matrix);
	if (det === 0) {
		throw new Error("Matrix is not invertible");
	}

	const [[a, b], [c, d]] = matrix;

	const adjugate: Mat2x2 = [
		[d, -b],
		[-c, a],
	];

	return mat2x2MultiplyScalar(adjugate, 1 / det);
}

export function mat2x2Negate(matrix: Mat2x2): Mat2x2 {
	return [
		[-matrix[0][0], -matrix[0][1]],
		[-matrix[1][0], -matrix[1][1]],
	];
}

export function mat2x2Sub(a: Mat2x2, b: Mat2x2): Mat2x2 {
	return [
		[a[0][0] - b[0][0], a[0][1] - b[0][1]],
		[a[1][0] - b[1][0], a[1][1] - b[1][1]],
	];
}
