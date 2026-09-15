import {
	clamp,
	isCloseTo,
	PreciseSum,
	round,
	type IsCloseToOptions,
	type RandomFn,
	type RoundOptions,
} from "@ac-kit/core";
import { diffOfProducts, dotPrecise, lerp, TWO_PI } from "@ac-kit/math-scalar";

import { SLERP_LINEAR_FALLBACK_DOT_ } from "./_slerp.js";
import { Mat3x3 } from "./mat3x3.js";
import { Mat4x4 } from "./mat4x4.js";
import { Quaternion } from "./quaternion.js";
import { DistanceType, Vec2 } from "./vec2.js";

export type Vec3 = [number, number, number];

export const VEC3_ZERO = [0, 0, 0] as const satisfies Vec3;
export const VEC3_ONE = [1, 1, 1] as const satisfies Vec3;

export function vec3Abs(v: Vec3): Vec3 {
	return [Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])];
}

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
	return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vec3AddScalar(v: Vec3, s: number): Vec3 {
	return [v[0] + s, v[1] + s, v[2] + s];
}

export function vec3AddScaled(a: Vec3, b: Vec3, s: number): Vec3 {
	return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
}

/**
 * Computes the angle in radians between two 3D vectors around a given axis. The
 * result is in the range (-π, π].
 */
export function vec3AngleTo(v1: Vec3, v2: Vec3, axis: Vec3): number {
	if (vec3LengthSq(v1) === 0 || vec3LengthSq(v2) === 0) {
		throw new Error("Cannot compute angle to/from a zero-length vector.");
	}

	const cross = vec3Cross(v1, v2);
	const angle = Math.atan2(vec3Length(cross), vec3Dot(v1, v2));
	const sign = vec3Dot(cross, axis) < 0 ? -1 : 1;

	return angle * sign;
}

/**
 * Computes the angle in radians between two 3D vectors. The result is in the
 * range [0, π].
 *
 * @throws Error if either vector is a zero-length vector.
 */
export function vec3AngleBetween(v1: Vec3, v2: Vec3): number {
	const dot = vec3Dot(v1, v2);
	const len1 = vec3Length(v1);
	const len2 = vec3Length(v2);

	if (len1 === 0 || len2 === 0) {
		throw new Error("Cannot compute angle between zero-length vectors");
	}

	const cosTheta = clamp(dot / (len1 * len2), -1, 1);
	return Math.acos(cosTheta);
}

export function vec3ApplyMat3(v: Vec3, m: Mat3x3): Vec3 {
	return [dotPrecise(v, m[0]), dotPrecise(v, m[1]), dotPrecise(v, m[2])];
}

/**
 * Applies a 4x4 matrix transformation to a 3D vector. The vector is treated as
 * a point in homogeneous coordinates (x, y, z, 1).
 */
export function vec3ApplyMat4(v: Vec3, m: Mat4x4): Vec3 {
	// The homogeneous 1 makes the translation column a fourth term of the dot.
	const homogeneous = [v[0], v[1], v[2], 1];

	return [
		dotPrecise(homogeneous, m[0]),
		dotPrecise(homogeneous, m[1]),
		dotPrecise(homogeneous, m[2]),
	];
}

export function vec3ApplyQuaternion(v: Vec3, q: Quaternion): Vec3 {
	const [qx, qy, qz, qw] = q;

	// Calculate quaternion * vector
	const ix = dotPrecise([qw, qy, -qz], [v[0], v[2], v[1]]);
	const iy = dotPrecise([qw, qz, -qx], [v[1], v[0], v[2]]);
	const iz = dotPrecise([qw, qx, -qy], [v[2], v[1], v[0]]);
	const iw = dotPrecise([-qx, -qy, -qz], v);

	// Calculate result * inverse quaternion
	return [
		dotPrecise([ix, -iw, -iy, iz], [qw, qx, qz, qy]),
		dotPrecise([iy, -iw, -iz, ix], [qw, qy, qx, qz]),
		dotPrecise([iz, -iw, -ix, iy], [qw, qz, qy, qx]),
	];
}

export function vec3Clamp(v: Vec3, min: Vec3, max: Vec3): Vec3 {
	return [
		clamp(v[0], min[0], max[0]),
		clamp(v[1], min[1], max[1]),
		clamp(v[2], min[2], max[2]),
	];
}

export function vec3ClampLength(
	v: Vec3,
	minLength: number,
	maxLength: number,
): Vec3 {
	const length = vec3Length(v);
	if (length === 0) {
		return v; // Can't scale a zero-length vector
	}

	const clampedLength = clamp(length, minLength, maxLength);

	return vec3MultiplyScalar(v, clampedLength / length);
}

export function vec3ClampScalar(v: Vec3, min: number, max: number): Vec3 {
	return [clamp(v[0], min, max), clamp(v[1], min, max), clamp(v[2], min, max)];
}

export function vec3Cross(a: Vec3, b: Vec3): Vec3 {
	return [
		diffOfProducts(a[1], b[2], a[2], b[1]),
		diffOfProducts(a[2], b[0], a[0], b[2]),
		diffOfProducts(a[0], b[1], a[1], b[0]),
	];
}

export function vec3DistanceTo(
	a: Vec3,
	b: Vec3,
	type: DistanceType = "euclidean",
): number {
	const dx = Math.abs(a[0] - b[0]);
	const dy = Math.abs(a[1] - b[1]);
	const dz = Math.abs(a[2] - b[2]);
	switch (type) {
		case "euclidean":
			return Math.hypot(dx, dy, dz);
		case "manhattan":
			return dx + dy + dz;
		case "chebyshev":
			return Math.max(dx, dy, dz);
	}
}

export function vec3DistanceToSq(a: Vec3, b: Vec3): number {
	const dx = a[0] - b[0];
	const dy = a[1] - b[1];
	const dz = a[2] - b[2];
	return dx * dx + dy * dy + dz * dz;
}

export function vec3Divide(a: Vec3, b: Vec3): Vec3 {
	return [a[0] / b[0], a[1] / b[1], a[2] / b[2]];
}

export function vec3DivideScalar(v: Vec3, s: number): Vec3 {
	return [v[0] / s, v[1] / s, v[2] / s];
}

export function vec3Dot(a: Vec3, b: Vec3): number {
	return dotPrecise(a, b);
}

/** Exact component-wise equality. See {@link vec3IsClose} for a tolerant test. */
export function vec3Equals(a: Vec3, b: Vec3): boolean {
	return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/**
 * Component-wise approximate equality.
 *
 * Not transitive, so it is not an equality in the sense a `Set` or `Map` needs,
 * and never a basis for ordering — use {@link vec3Equals} there. `tolerance` is
 * required: a vector carries no units of its own, so only the caller knows what
 * counts as close.
 */
export function vec3IsClose(
	a: Vec3,
	b: Vec3,
	tolerance: IsCloseToOptions,
): boolean {
	return (
		isCloseTo(a[0], b[0], tolerance) &&
		isCloseTo(a[1], b[1], tolerance) &&
		isCloseTo(a[2], b[2], tolerance)
	);
}

export function vec3FromVec2(v: Vec2, z: number = 0): Vec3 {
	return [v[0], v[1], z];
}

export function vec3Length(v: Vec3, type: DistanceType = "euclidean"): number {
	switch (type) {
		case "euclidean":
			return Math.hypot(v[0], v[1], v[2]);
		case "manhattan":
			return Math.abs(v[0]) + Math.abs(v[1]) + Math.abs(v[2]);
		case "chebyshev":
			return Math.max(Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2]));
	}
}

export function vec3LengthSq(v: Vec3): number {
	return vec3Dot(v, v);
}

export function vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
	return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function vec3Max(a: Vec3, b: Vec3): Vec3 {
	return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
}

export function vec3Min(a: Vec3, b: Vec3): Vec3 {
	return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])];
}

export function vec3Minmax(vs: readonly Vec3[]): { min: Vec3; max: Vec3 } {
	let minX = Infinity,
		minY = Infinity,
		minZ = Infinity;
	let maxX = -Infinity,
		maxY = -Infinity,
		maxZ = -Infinity;
	for (const v of vs) {
		if (v[0] < minX) minX = v[0];
		if (v[1] < minY) minY = v[1];
		if (v[2] < minZ) minZ = v[2];
		if (v[0] > maxX) maxX = v[0];
		if (v[1] > maxY) maxY = v[1];
		if (v[2] > maxZ) maxZ = v[2];
	}
	return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

export function vec3Multiply(a: Vec3, b: Vec3): Vec3 {
	return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}

export function vec3MultiplyScalar(v: Vec3, s: number): Vec3 {
	return [v[0] * s, v[1] * s, v[2] * s];
}

export function vec3Negate(v: Vec3): Vec3 {
	return [-v[0], -v[1], -v[2]];
}

export function vec3Normalize(v: Vec3): Vec3 {
	const length = vec3Length(v);
	if (length === 0) {
		throw new Error("Cannot normalize a zero-length vector");
	}
	return vec3DivideScalar(v, length);
}

/**
 * Computes a vector that is perpendicular to the given 3D vector. The result is
 * not unique; this function returns one of the possible perpendicular vectors.
 *
 * The returned vector is guaranteed to be perpendicular to the input vector,
 * but its direction is arbitrary. If the input vector is a zero vector, the
 * function will throw an error.
 */
export function vec3Perpendicular(v: Vec3): Vec3 {
	// Find a vector that is not parallel to v
	let other: Vec3;
	if (Math.abs(v[0]) < Math.abs(v[1])) {
		other = [1, 0, 0];
	} else {
		other = [0, 1, 0];
	}

	// Compute the cross product to get a perpendicular vector
	const perp = vec3Cross(v, other);

	// Normalize the perpendicular vector
	return vec3Normalize(perp);
}

export function vec3Project(v: Vec3, onto: Vec3): Vec3 {
	const ontoLengthSq = vec3LengthSq(onto);
	if (ontoLengthSq === 0) {
		throw new Error("Cannot project onto a zero-length vector");
	}
	const scale = vec3Dot(v, onto) / ontoLengthSq;
	return vec3MultiplyScalar(onto, scale);
}

export function vec3ProjectOntoPlane(v: Vec3, planeNormal: Vec3): Vec3 {
	return vec3Sub(v, vec3Project(v, planeNormal));
}

export function vec3Random(randFn?: RandomFn | null): Vec3 {
	const random = randFn ?? Math.random;
	const azimuth = random() * TWO_PI;
	const inclination = Math.acos(2 * random() - 1); // uniform surface distribution — not random() * π
	const sinI = Math.sin(inclination);
	return [
		sinI * Math.cos(azimuth),
		Math.cos(inclination),
		sinI * Math.sin(azimuth),
	];
}

export function vec3Reflect(v: Vec3, normal: Vec3): Vec3 {
	const dot = vec3Dot(v, normal);
	return vec3Sub(v, vec3MultiplyScalar(normal, 2 * dot));
}

export function vec3RotateAroundAxis(v: Vec3, axis: Vec3, angle: number): Vec3 {
	const cosA = Math.cos(angle);
	const sinA = Math.sin(angle);
	const dot = vec3Dot(axis, v);
	const cross = vec3Cross(axis, v);
	const weights = [cosA, sinA, dot * (1 - cosA)];

	return [
		dotPrecise(weights, [v[0], cross[0], axis[0]]),
		dotPrecise(weights, [v[1], cross[1], axis[1]]),
		dotPrecise(weights, [v[2], cross[2], axis[2]]),
	];
}

export function vec3Round(v: Vec3, options?: RoundOptions): Vec3 {
	return [round(v[0], options), round(v[1], options), round(v[2], options)];
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vec3SubScalar(v: Vec3, s: number): Vec3 {
	return [v[0] - s, v[1] - s, v[2] - s];
}

export function vec3SubScaled(a: Vec3, b: Vec3, s: number): Vec3 {
	return [a[0] - b[0] * s, a[1] - b[1] * s, a[2] - b[2] * s];
}

/**
 * Spherical linear interpolation between two 3D unit vectors. Both `a` and `b`
 * should be unit-length for correct results. Falls back to normalized linear
 * interpolation when vectors are nearly parallel or anti-parallel.
 */
export function vec3Slerp(a: Vec3, b: Vec3, t: number): Vec3 {
	const dot = clamp(vec3Dot(a, b), -1, 1);

	if (dot > SLERP_LINEAR_FALLBACK_DOT_) {
		// Nearly parallel — use normalized lerp for numerical stability
		return vec3Normalize(vec3Lerp(a, b, t));
	}

	if (dot < -SLERP_LINEAR_FALLBACK_DOT_) {
		// Nearly anti-parallel — the great-circle arc is ambiguous; rotate `a` by
		// t·π around an arbitrary axis perpendicular to it
		return vec3RotateAroundAxis(
			a,
			vec3Normalize(vec3Perpendicular(a)),
			Math.PI * t,
		);
	}

	const theta = Math.acos(dot) * t;
	const relB = vec3Normalize(vec3Sub(b, vec3MultiplyScalar(a, dot)));
	return vec3Add(
		vec3MultiplyScalar(a, Math.cos(theta)),
		vec3MultiplyScalar(relB, Math.sin(theta)),
	);
}
export function vec3WeightedMean<T>(
	items: readonly T[],
	getWeightedValue: (item: T) => [v: Vec3, w: number],
): Vec3 {
	const x = new PreciseSum();
	const y = new PreciseSum();
	const z = new PreciseSum();
	const totalWeight = new PreciseSum();

	for (const item of items) {
		const [vec, w] = getWeightedValue(item);

		x.add(vec[0] * w);
		y.add(vec[1] * w);
		z.add(vec[2] * w);
		totalWeight.add(w);
	}

	const weight = totalWeight.value;

	return [x.value / weight, y.value / weight, z.value / weight];
}
