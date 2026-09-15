import { isCloseTo, type IsCloseToOptions } from "@ac-kit/core";
import { diffOfProducts, dotPrecise } from "@ac-kit/math-scalar";

import { Quaternion } from "./quaternion.js";
import { Vec3 } from "./vec3.js";
import { Vec4 } from "./vec4.js";

export type Mat4x4 = [
	[number, number, number, number],
	[number, number, number, number],
	[number, number, number, number],
	[number, number, number, number],
];

export const MAT4X4_ZERO = [
	[0, 0, 0, 0],
	[0, 0, 0, 0],
	[0, 0, 0, 0],
	[0, 0, 0, 0],
] as const satisfies Mat4x4;
export const MAT4X4_IDENTITY = [
	[1, 0, 0, 0],
	[0, 1, 0, 0],
	[0, 0, 1, 0],
	[0, 0, 0, 1],
] as const satisfies Mat4x4;

export function mat4x4Add(a: Mat4x4, b: Mat4x4): Mat4x4 {
	return [
		[
			a[0][0] + b[0][0],
			a[0][1] + b[0][1],
			a[0][2] + b[0][2],
			a[0][3] + b[0][3],
		],
		[
			a[1][0] + b[1][0],
			a[1][1] + b[1][1],
			a[1][2] + b[1][2],
			a[1][3] + b[1][3],
		],
		[
			a[2][0] + b[2][0],
			a[2][1] + b[2][1],
			a[2][2] + b[2][2],
			a[2][3] + b[2][3],
		],
		[
			a[3][0] + b[3][0],
			a[3][1] + b[3][1],
			a[3][2] + b[3][2],
			a[3][3] + b[3][3],
		],
	];
}

/**
 * Composes a 4×4 transformation matrix from translation, rotation (quaternion),
 * and scale. Equivalent to T × R × S.
 */
export function mat4x4Compose(
	translation: Vec3,
	rotation: Quaternion,
	scale: Vec3,
): Mat4x4 {
	const r = mat4x4FromQuaternion(rotation);
	const [sx, sy, sz] = scale;
	return [
		[r[0][0] * sx, r[0][1] * sy, r[0][2] * sz, translation[0]],
		[r[1][0] * sx, r[1][1] * sy, r[1][2] * sz, translation[1]],
		[r[2][0] * sx, r[2][1] * sy, r[2][2] * sz, translation[2]],
		[0, 0, 0, 1],
	];
}

export function mat4x4Determinant(m: Mat4x4): number {
	const [a00, a01, a02, a03] = m[0];
	const [a10, a11, a12, a13] = m[1];
	const [a20, a21, a22, a23] = m[2];
	const [a30, a31, a32, a33] = m[3];

	const b00 = diffOfProducts(a00, a11, a01, a10);
	const b01 = diffOfProducts(a00, a12, a02, a10);
	const b02 = diffOfProducts(a00, a13, a03, a10);
	const b03 = diffOfProducts(a01, a12, a02, a11);
	const b04 = diffOfProducts(a01, a13, a03, a11);
	const b05 = diffOfProducts(a02, a13, a03, a12);
	const b06 = diffOfProducts(a20, a31, a21, a30);
	const b07 = diffOfProducts(a20, a32, a22, a30);
	const b08 = diffOfProducts(a20, a33, a23, a30);
	const b09 = diffOfProducts(a21, a32, a22, a31);
	const b10 = diffOfProducts(a21, a33, a23, a31);
	const b11 = diffOfProducts(a22, a33, a23, a32);

	// Each minor is now exactly rounded; the six outer products still cancel, so
	// the whole expansion goes through one compensated dot product.
	return dotPrecise(
		[b00, -b01, b02, b03, -b04, b05],
		[b11, b10, b09, b08, b07, b06],
	);
}

/** Exact element-wise equality. See {@link mat4x4IsClose} for a tolerant test. */
export function mat4x4Equals(a: Mat4x4, b: Mat4x4): boolean {
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			if (a[i]![j]! !== b[i]![j]!) {
				return false;
			}
		}
	}
	return true;
}

/**
 * Element-wise approximate equality.
 *
 * Not transitive, so it is not an equality in the sense a `Set` or `Map` needs,
 * and never a basis for ordering — use {@link mat4x4Equals} there.
 */
export function mat4x4IsClose(
	a: Mat4x4,
	b: Mat4x4,
	tolerance: IsCloseToOptions,
): boolean {
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			if (!isCloseTo(a[i]![j]!, b[i]![j]!, tolerance)) {
				return false;
			}
		}
	}
	return true;
}

/**
 * Creates a 4×4 matrix from a quaternion (pure rotation, no translation or
 * scale).
 */
export function mat4x4FromQuaternion(q: Quaternion): Mat4x4 {
	const x = q[0],
		y = q[1],
		z = q[2],
		w = q[3];
	const xx = x * x,
		yy = y * y,
		zz = z * z;
	const xy = x * y,
		xz = x * z,
		yz = y * z;
	const wx = w * x,
		wy = w * y,
		wz = w * z;
	return [
		[1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy), 0],
		[2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx), 0],
		[2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy), 0],
		[0, 0, 0, 1],
	];
}

/** Creates a 4×4 rotation matrix around the X axis (right-hand rule). */
export function mat4x4FromRotationX(angle: number): Mat4x4 {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [
		[1, 0, 0, 0],
		[0, cos, -sin, 0],
		[0, sin, cos, 0],
		[0, 0, 0, 1],
	];
}

/** Creates a 4×4 rotation matrix around the Y axis (right-hand rule). */
export function mat4x4FromRotationY(angle: number): Mat4x4 {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [
		[cos, 0, sin, 0],
		[0, 1, 0, 0],
		[-sin, 0, cos, 0],
		[0, 0, 0, 1],
	];
}

/** Creates a 4×4 rotation matrix around the Z axis (right-hand rule). */
export function mat4x4FromRotationZ(angle: number): Mat4x4 {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [
		[cos, -sin, 0, 0],
		[sin, cos, 0, 0],
		[0, 0, 1, 0],
		[0, 0, 0, 1],
	];
}

export function mat4x4FromScale(v: Vec3): Mat4x4 {
	return [
		[v[0], 0, 0, 0],
		[0, v[1], 0, 0],
		[0, 0, v[2], 0],
		[0, 0, 0, 1],
	];
}

export function mat4x4FromTranslation(v: Vec3): Mat4x4 {
	return [
		[1, 0, 0, v[0]],
		[0, 1, 0, v[1]],
		[0, 0, 1, v[2]],
		[0, 0, 0, 1],
	];
}

export function mat4x4Invert(m: Mat4x4): Mat4x4 {
	const n11 = m[0][0],
		n12 = m[0][1],
		n13 = m[0][2],
		n14 = m[0][3];
	const n21 = m[1][0],
		n22 = m[1][1],
		n23 = m[1][2],
		n24 = m[1][3];
	const n31 = m[2][0],
		n32 = m[2][1],
		n33 = m[2][2],
		n34 = m[2][3];
	const n41 = m[3][0],
		n42 = m[3][1],
		n43 = m[3][2],
		n44 = m[3][3];

	// The sixteen cofactors share eighteen 2x2 minors between them; naming each
	// one `rIJcKL` (rows I,J and columns K,L) computes it once and exactly.
	const r34c34 = diffOfProducts(n33, n44, n34, n43);
	const r34c24 = diffOfProducts(n32, n44, n34, n42);
	const r34c23 = diffOfProducts(n32, n43, n33, n42);
	const r34c14 = diffOfProducts(n31, n44, n34, n41);
	const r34c13 = diffOfProducts(n31, n43, n33, n41);
	const r34c12 = diffOfProducts(n31, n42, n32, n41);

	const r24c34 = diffOfProducts(n23, n44, n24, n43);
	const r24c24 = diffOfProducts(n22, n44, n24, n42);
	const r24c23 = diffOfProducts(n22, n43, n23, n42);
	const r24c14 = diffOfProducts(n21, n44, n24, n41);
	const r24c13 = diffOfProducts(n21, n43, n23, n41);
	const r24c12 = diffOfProducts(n21, n42, n22, n41);

	const r23c34 = diffOfProducts(n23, n34, n24, n33);
	const r23c24 = diffOfProducts(n22, n34, n24, n32);
	const r23c23 = diffOfProducts(n22, n33, n23, n32);
	const r23c14 = diffOfProducts(n21, n34, n24, n31);
	const r23c13 = diffOfProducts(n21, n33, n23, n31);
	const r23c12 = diffOfProducts(n21, n32, n22, n31);

	const c11 = cofactor_(n22, r34c34, n23, r34c24, n24, r34c23);
	const c12 = -cofactor_(n21, r34c34, n23, r34c14, n24, r34c13);
	const c13 = cofactor_(n21, r34c24, n22, r34c14, n24, r34c12);
	const c14 = -cofactor_(n21, r34c23, n22, r34c13, n23, r34c12);

	const det = dotPrecise([n11, n12, n13, n14], [c11, c12, c13, c14]);
	if (det === 0) {
		throw new Error("Matrix is not invertible.");
	}
	const inv = 1 / det;

	const c21 = -cofactor_(n12, r34c34, n13, r34c24, n14, r34c23);
	const c22 = cofactor_(n11, r34c34, n13, r34c14, n14, r34c13);
	const c23 = -cofactor_(n11, r34c24, n12, r34c14, n14, r34c12);
	const c24 = cofactor_(n11, r34c23, n12, r34c13, n13, r34c12);

	const c31 = cofactor_(n12, r24c34, n13, r24c24, n14, r24c23);
	const c32 = -cofactor_(n11, r24c34, n13, r24c14, n14, r24c13);
	const c33 = cofactor_(n11, r24c24, n12, r24c14, n14, r24c12);
	const c34 = -cofactor_(n11, r24c23, n12, r24c13, n13, r24c12);

	const c41 = -cofactor_(n12, r23c34, n13, r23c24, n14, r23c23);
	const c42 = cofactor_(n11, r23c34, n13, r23c14, n14, r23c13);
	const c43 = -cofactor_(n11, r23c24, n12, r23c14, n14, r23c12);
	const c44 = cofactor_(n11, r23c23, n12, r23c13, n13, r23c12);

	// Inverse = transpose(cofactor matrix) / det
	return [
		[c11 * inv, c21 * inv, c31 * inv, c41 * inv],
		[c12 * inv, c22 * inv, c32 * inv, c42 * inv],
		[c13 * inv, c23 * inv, c33 * inv, c43 * inv],
		[c14 * inv, c24 * inv, c34 * inv, c44 * inv],
	];
}

/** `a*x - b*y + c*z`, the alternating expansion every 3x3 cofactor takes. */
function cofactor_(
	a: number,
	x: number,
	b: number,
	y: number,
	c: number,
	z: number,
): number {
	return dotPrecise([a, -b, c], [x, y, z]);
}

export function mat4x4Multiply(a: Mat4x4, b: Mat4x4): Mat4x4 {
	const columns = mat4x4Transpose(b);
	const result: Mat4x4 = [
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
	];
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			result[i]![j] = dotPrecise(a[i]!, columns[j]!);
		}
	}
	return result;
}

export function mat4x4MultiplyCols(matrix: Mat4x4, v: Vec4): Mat4x4 {
	return [
		[
			matrix[0][0] * v[0],
			matrix[0][1] * v[1],
			matrix[0][2] * v[2],
			matrix[0][3] * v[3],
		],
		[
			matrix[1][0] * v[0],
			matrix[1][1] * v[1],
			matrix[1][2] * v[2],
			matrix[1][3] * v[3],
		],
		[
			matrix[2][0] * v[0],
			matrix[2][1] * v[1],
			matrix[2][2] * v[2],
			matrix[2][3] * v[3],
		],
		[
			matrix[3][0] * v[0],
			matrix[3][1] * v[1],
			matrix[3][2] * v[2],
			matrix[3][3] * v[3],
		],
	];
}

export function mat4x4MultiplyRows(matrix: Mat4x4, v: Vec4): Mat4x4 {
	return [
		[
			matrix[0][0] * v[0],
			matrix[0][1] * v[0],
			matrix[0][2] * v[0],
			matrix[0][3] * v[0],
		],
		[
			matrix[1][0] * v[1],
			matrix[1][1] * v[1],
			matrix[1][2] * v[1],
			matrix[1][3] * v[1],
		],
		[
			matrix[2][0] * v[2],
			matrix[2][1] * v[2],
			matrix[2][2] * v[2],
			matrix[2][3] * v[2],
		],
		[
			matrix[3][0] * v[3],
			matrix[3][1] * v[3],
			matrix[3][2] * v[3],
			matrix[3][3] * v[3],
		],
	];
}

export function mat4x4MultiplyScalar(matrix: Mat4x4, scalar: number): Mat4x4 {
	return [
		[
			matrix[0][0] * scalar,
			matrix[0][1] * scalar,
			matrix[0][2] * scalar,
			matrix[0][3] * scalar,
		],
		[
			matrix[1][0] * scalar,
			matrix[1][1] * scalar,
			matrix[1][2] * scalar,
			matrix[1][3] * scalar,
		],
		[
			matrix[2][0] * scalar,
			matrix[2][1] * scalar,
			matrix[2][2] * scalar,
			matrix[2][3] * scalar,
		],
		[
			matrix[3][0] * scalar,
			matrix[3][1] * scalar,
			matrix[3][2] * scalar,
			matrix[3][3] * scalar,
		],
	];
}

export function mat4x4Negate(matrix: Mat4x4): Mat4x4 {
	return [
		[-matrix[0][0], -matrix[0][1], -matrix[0][2], -matrix[0][3]],
		[-matrix[1][0], -matrix[1][1], -matrix[1][2], -matrix[1][3]],
		[-matrix[2][0], -matrix[2][1], -matrix[2][2], -matrix[2][3]],
		[-matrix[3][0], -matrix[3][1], -matrix[3][2], -matrix[3][3]],
	];
}

export function mat4x4Sub(a: Mat4x4, b: Mat4x4): Mat4x4 {
	return [
		[
			a[0][0] - b[0][0],
			a[0][1] - b[0][1],
			a[0][2] - b[0][2],
			a[0][3] - b[0][3],
		],
		[
			a[1][0] - b[1][0],
			a[1][1] - b[1][1],
			a[1][2] - b[1][2],
			a[1][3] - b[1][3],
		],
		[
			a[2][0] - b[2][0],
			a[2][1] - b[2][1],
			a[2][2] - b[2][2],
			a[2][3] - b[2][3],
		],
		[
			a[3][0] - b[3][0],
			a[3][1] - b[3][1],
			a[3][2] - b[3][2],
			a[3][3] - b[3][3],
		],
	];
}

export function mat4x4Transpose(matrix: Mat4x4): Mat4x4 {
	return [
		[matrix[0][0], matrix[1][0], matrix[2][0], matrix[3][0]],
		[matrix[0][1], matrix[1][1], matrix[2][1], matrix[3][1]],
		[matrix[0][2], matrix[1][2], matrix[2][2], matrix[3][2]],
		[matrix[0][3], matrix[1][3], matrix[2][3], matrix[3][3]],
	];
}
