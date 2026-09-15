import { isCloseTo, type IsCloseToOptions } from "@ac-kit/core";
import { diffOfProducts, dotPrecise, sumOfProducts } from "@ac-kit/math-scalar";

export type Quaternion = [number, number, number, number];

export const QUATERNION_IDENTITY = [0, 0, 0, 1] as const satisfies Quaternion;

export function quaternionAdd(q1: Quaternion, q2: Quaternion): Quaternion {
	return [q1[0] + q2[0], q1[1] + q2[1], q1[2] + q2[2], q1[3] + q2[3]];
}

export function quaternionSub(q1: Quaternion, q2: Quaternion): Quaternion {
	return [q1[0] - q2[0], q1[1] - q2[1], q1[2] - q2[2], q1[3] - q2[3]];
}

export function quaternionNeg(q: Quaternion): Quaternion {
	return [-q[0], -q[1], -q[2], -q[3]];
}

export function quaternionConjugate(q: Quaternion): Quaternion {
	return [-q[0], -q[1], -q[2], q[3]];
}

export function quaternionDot(q1: Quaternion, q2: Quaternion): number {
	return dotPrecise(q1, q2);
}

/**
 * Exact component-wise equality. See {@link quaternionIsClose} for a tolerant
 * test.
 *
 * Compares the four components, so `q` and `-q` are not equal even though they
 * denote the same rotation.
 */
export function quaternionEquals(q1: Quaternion, q2: Quaternion): boolean {
	return (
		q1[0] === q2[0] && q1[1] === q2[1] && q1[2] === q2[2] && q1[3] === q2[3]
	);
}

/**
 * Component-wise approximate equality.
 *
 * Not transitive, so it is not an equality in the sense a `Set` or `Map` needs,
 * and never a basis for ordering — use {@link quaternionEquals} there. Like the
 * exact form it compares components, so `q` and `-q` are not close even though
 * they denote the same rotation; compare `|quaternionDot(q1, q2)|` against `1`
 * to test the rotations instead.
 */
export function quaternionIsClose(
	q1: Quaternion,
	q2: Quaternion,
	tolerance: IsCloseToOptions,
): boolean {
	return (
		isCloseTo(q1[0], q2[0], tolerance) &&
		isCloseTo(q1[1], q2[1], tolerance) &&
		isCloseTo(q1[2], q2[2], tolerance) &&
		isCloseTo(q1[3], q2[3], tolerance)
	);
}

export function quaternionInverse(q: Quaternion): Quaternion {
	const conjugate = quaternionConjugate(q);
	const normSq = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
	if (normSq === 0) {
		throw new Error("Cannot invert a zero-length quaternion.");
	}
	return [
		conjugate[0] / normSq,
		conjugate[1] / normSq,
		conjugate[2] / normSq,
		conjugate[3] / normSq,
	];
}

export function quaternionLength(q: Quaternion): number {
	return Math.sqrt(quaternionLengthSq(q));
}

export function quaternionLengthSq(q: Quaternion): number {
	return q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
}

export function quaternionMultiply(q1: Quaternion, q2: Quaternion): Quaternion {
	const x1 = q1[0],
		y1 = q1[1],
		z1 = q1[2],
		w1 = q1[3];
	const x2 = q2[0],
		y2 = q2[1],
		z2 = q2[2],
		w2 = q2[3];

	return [
		sumOfProducts(w1, x2, x1, w2) + diffOfProducts(y1, z2, z1, y2),
		diffOfProducts(w1, y2, x1, z2) + sumOfProducts(y1, w2, z1, x2),
		sumOfProducts(w1, z2, x1, y2) + diffOfProducts(z1, w2, y1, x2),
		diffOfProducts(w1, w2, x1, x2) - sumOfProducts(y1, y2, z1, z2),
	];
}

export function quaternionNormalize(q: Quaternion): Quaternion {
	const length = Math.sqrt(
		q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3],
	);
	if (length === 0) {
		throw new Error("Cannot normalize a zero-length quaternion.");
	}
	return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
}
