import {
	clamp,
	isCloseTo,
	type IsCloseToOptions,
	PreciseSum,
	round,
	type RoundOptions,
} from "@ac-kit/core";
import { dotPrecise, lerp } from "@ac-kit/math-scalar";

import { SLERP_LINEAR_FALLBACK_DOT_ } from "./_slerp.js";
import { Mat4x4 } from "./mat4x4.js";
import { DistanceType } from "./vec2.js";
import { Vec3 } from "./vec3.js";

export type Vec4 = [number, number, number, number];

export const VEC4_ZERO = [0, 0, 0, 0] as const satisfies Vec4;
export const VEC4_ONE = [1, 1, 1, 1] as const satisfies Vec4;

export function vec4Abs(v: Vec4): Vec4 {
	return [Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2]), Math.abs(v[3])];
}

export function vec4Add(a: Vec4, b: Vec4): Vec4 {
	return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
}

export function vec4AddScalar(v: Vec4, s: number): Vec4 {
	return [v[0] + s, v[1] + s, v[2] + s, v[3] + s];
}

export function vec4AddScaled(a: Vec4, b: Vec4, s: number): Vec4 {
	return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s, a[3] + b[3] * s];
}

export function vec4ApplyMat4(v: Vec4, m: Mat4x4): Vec4 {
	return [
		v[0] * m[0][0] + v[1] * m[0][1] + v[2] * m[0][2] + v[3] * m[0][3],
		v[0] * m[1][0] + v[1] * m[1][1] + v[2] * m[1][2] + v[3] * m[1][3],
		v[0] * m[2][0] + v[1] * m[2][1] + v[2] * m[2][2] + v[3] * m[2][3],
		v[0] * m[3][0] + v[1] * m[3][1] + v[2] * m[3][2] + v[3] * m[3][3],
	];
}

export function vec4Clamp(v: Vec4, min: Vec4, max: Vec4): Vec4 {
	return [
		clamp(v[0], min[0], max[0]),
		clamp(v[1], min[1], max[1]),
		clamp(v[2], min[2], max[2]),
		clamp(v[3], min[3], max[3]),
	];
}

export function vec4ClampLength(
	v: Vec4,
	minLength: number,
	maxLength: number,
): Vec4 {
	const length = vec4Length(v);
	if (length === 0) {
		return v; // Can't scale a zero-length vector
	}

	const clampedLength = clamp(length, minLength, maxLength);

	return vec4MultiplyScalar(v, clampedLength / length);
}
export function vec4ClampScalar(v: Vec4, min: number, max: number): Vec4 {
	return [
		clamp(v[0], min, max),
		clamp(v[1], min, max),
		clamp(v[2], min, max),
		clamp(v[3], min, max),
	];
}

export function vec4DistanceTo(
	a: Vec4,
	b: Vec4,
	type: DistanceType = "euclidean",
): number {
	const dx = Math.abs(a[0] - b[0]);
	const dy = Math.abs(a[1] - b[1]);
	const dz = Math.abs(a[2] - b[2]);
	const dw = Math.abs(a[3] - b[3]);
	switch (type) {
		case "euclidean":
			return Math.hypot(dx, dy, dz, dw);
		case "manhattan":
			return dx + dy + dz + dw;
		case "chebyshev":
			return Math.max(dx, dy, dz, dw);
	}
}

export function vec4DistanceToSq(a: Vec4, b: Vec4): number {
	const dx = a[0] - b[0];
	const dy = a[1] - b[1];
	const dz = a[2] - b[2];
	const dw = a[3] - b[3];
	return dx * dx + dy * dy + dz * dz + dw * dw;
}

export function vec4Divide(a: Vec4, b: Vec4): Vec4 {
	return [a[0] / b[0], a[1] / b[1], a[2] / b[2], a[3] / b[3]];
}

export function vec4DivideScalar(v: Vec4, s: number): Vec4 {
	return [v[0] / s, v[1] / s, v[2] / s, v[3] / s];
}

export function vec4Dot(a: Vec4, b: Vec4): number {
	return dotPrecise(a, b);
}

/** Exact component-wise equality. See {@link vec4IsClose} for a tolerant test. */
export function vec4Equals(a: Vec4, b: Vec4): boolean {
	return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

/**
 * Component-wise approximate equality.
 *
 * Not transitive, so it is not an equality in the sense a `Set` or `Map` needs,
 * and never a basis for ordering — use {@link vec4Equals} there. `tolerance` is
 * required: a vector carries no units of its own, so only the caller knows what
 * counts as close.
 */
export function vec4IsClose(
	a: Vec4,
	b: Vec4,
	tolerance: IsCloseToOptions,
): boolean {
	return (
		isCloseTo(a[0], b[0], tolerance) &&
		isCloseTo(a[1], b[1], tolerance) &&
		isCloseTo(a[2], b[2], tolerance) &&
		isCloseTo(a[3], b[3], tolerance)
	);
}

export function vec4FromVec3(v: Vec3, w: number = 0): Vec4 {
	return [v[0], v[1], v[2], w];
}

export function vec4Length(v: Vec4, type: DistanceType = "euclidean"): number {
	switch (type) {
		case "euclidean":
			return Math.hypot(v[0], v[1], v[2], v[3]);
		case "manhattan":
			return Math.abs(v[0]) + Math.abs(v[1]) + Math.abs(v[2]) + Math.abs(v[3]);
		case "chebyshev":
			return Math.max(
				Math.abs(v[0]),
				Math.abs(v[1]),
				Math.abs(v[2]),
				Math.abs(v[3]),
			);
	}
}

export function vec4LengthSq(v: Vec4): number {
	return vec4Dot(v, v);
}

export function vec4Lerp(a: Vec4, b: Vec4, t: number): Vec4 {
	return [
		lerp(a[0], b[0], t),
		lerp(a[1], b[1], t),
		lerp(a[2], b[2], t),
		lerp(a[3], b[3], t),
	];
}

export function vec4Max(a: Vec4, b: Vec4): Vec4 {
	return [
		Math.max(a[0], b[0]),
		Math.max(a[1], b[1]),
		Math.max(a[2], b[2]),
		Math.max(a[3], b[3]),
	];
}

export function vec4Min(a: Vec4, b: Vec4): Vec4 {
	return [
		Math.min(a[0], b[0]),
		Math.min(a[1], b[1]),
		Math.min(a[2], b[2]),
		Math.min(a[3], b[3]),
	];
}

export function vec4Minmax(vs: readonly Vec4[]): { min: Vec4; max: Vec4 } {
	let minX = Infinity,
		minY = Infinity,
		minZ = Infinity,
		minW = Infinity;
	let maxX = -Infinity,
		maxY = -Infinity,
		maxZ = -Infinity,
		maxW = -Infinity;
	for (const v of vs) {
		if (v[0] < minX) minX = v[0];
		if (v[1] < minY) minY = v[1];
		if (v[2] < minZ) minZ = v[2];
		if (v[3] < minW) minW = v[3];
		if (v[0] > maxX) maxX = v[0];
		if (v[1] > maxY) maxY = v[1];
		if (v[2] > maxZ) maxZ = v[2];
		if (v[3] > maxW) maxW = v[3];
	}
	return { min: [minX, minY, minZ, minW], max: [maxX, maxY, maxZ, maxW] };
}

export function vec4Multiply(a: Vec4, b: Vec4): Vec4 {
	return [a[0] * b[0], a[1] * b[1], a[2] * b[2], a[3] * b[3]];
}

export function vec4MultiplyScalar(v: Vec4, s: number): Vec4 {
	return [v[0] * s, v[1] * s, v[2] * s, v[3] * s];
}

export function vec4Negate(v: Vec4): Vec4 {
	return [-v[0], -v[1], -v[2], -v[3]];
}

export function vec4Normalize(v: Vec4): Vec4 {
	const length = vec4Length(v);
	if (length === 0) {
		throw new Error("Cannot normalize a zero-length vector.");
	}
	return vec4DivideScalar(v, length);
}

export function vec4PerspectiveDivide(v: Vec4): Vec3 {
	if (v[3] === 0) {
		throw new Error("Cannot perform perspective divide on a vector with w=0.");
	}
	return [v[0] / v[3], v[1] / v[3], v[2] / v[3]];
}

export function vec4Project(v: Vec4, onto: Vec4): Vec4 {
	const ontoLengthSq = vec4LengthSq(onto);
	if (ontoLengthSq === 0) {
		throw new Error("Cannot project onto a zero-length vector.");
	}
	const scale = vec4Dot(v, onto) / ontoLengthSq;
	return vec4MultiplyScalar(onto, scale);
}

export function vec4Reflect(v: Vec4, normal: Vec4): Vec4 {
	const dot = vec4Dot(v, normal);
	return vec4Sub(v, vec4MultiplyScalar(normal, 2 * dot));
}

export function vec4Round(v: Vec4, options?: RoundOptions): Vec4 {
	return [
		round(v[0], options),
		round(v[1], options),
		round(v[2], options),
		round(v[3], options),
	];
}

export function vec4Sub(a: Vec4, b: Vec4): Vec4 {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]];
}

export function vec4SubScalar(v: Vec4, s: number): Vec4 {
	return [v[0] - s, v[1] - s, v[2] - s, v[3] - s];
}

export function vec4SubScaled(a: Vec4, b: Vec4, s: number): Vec4 {
	return [a[0] - b[0] * s, a[1] - b[1] * s, a[2] - b[2] * s, a[3] - b[3] * s];
}

/**
 * Spherical linear interpolation between two 4D unit vectors. Both `a` and `b`
 * should be unit-length for correct results.
 */
export function vec4Slerp(a: Vec4, b: Vec4, t: number): Vec4 {
	let dot = vec4Dot(a, b);
	if (dot < 0) {
		b = vec4Negate(b);
		dot = -dot;
	}
	if (dot > SLERP_LINEAR_FALLBACK_DOT_) {
		return vec4Normalize(vec4Lerp(a, b, t));
	}
	const theta0 = Math.acos(dot);
	const theta = theta0 * t;
	const sinTheta = Math.sin(theta);
	const sinTheta0 = Math.sin(theta0);
	const s1 = Math.cos(theta) - (dot * sinTheta) / sinTheta0;
	const s2 = sinTheta / sinTheta0;
	return [
		s1 * a[0] + s2 * b[0],
		s1 * a[1] + s2 * b[1],
		s1 * a[2] + s2 * b[2],
		s1 * a[3] + s2 * b[3],
	];
}

export function vec4WeightedMean<T>(
	items: readonly T[],
	getWeightedValue: (item: T) => [v: Vec4, w: number],
): Vec4 {
	const x = new PreciseSum();
	const y = new PreciseSum();
	const z = new PreciseSum();
	const w = new PreciseSum();
	const totalWeight = new PreciseSum();

	for (const item of items) {
		const [vec, itemWeight] = getWeightedValue(item);

		x.add(vec[0] * itemWeight);
		y.add(vec[1] * itemWeight);
		z.add(vec[2] * itemWeight);
		w.add(vec[3] * itemWeight);
		totalWeight.add(itemWeight);
	}

	const weight = totalWeight.value;

	return [
		x.value / weight,
		y.value / weight,
		z.value / weight,
		w.value / weight,
	];
}
