import {
	clamp,
	isCloseTo,
	mod,
	PreciseSum,
	round,
	type IsCloseToOptions,
	type RandomFn,
	type RoundOptions,
} from "@ac-kit/core";
import {
	diffOfProducts,
	dotPrecise,
	lerp,
	sumOfProducts,
	TWO_PI,
} from "@ac-kit/math-scalar";

import { Mat2x2 } from "./mat2x2.js";
import { Mat3x3 } from "./mat3x3.js";

export type DistanceType = "euclidean" | "manhattan" | "chebyshev";

export type Vec2 = [number, number];

export const VEC2_ZERO = [0, 0] as const satisfies Vec2;
export const VEC2_ONE = [1, 1] as const satisfies Vec2;

export function vec2Abs(v: Vec2): Vec2 {
	return [Math.abs(v[0]), Math.abs(v[1])];
}

export function vec2Add(a: Vec2, b: Vec2): Vec2 {
	return [a[0] + b[0], a[1] + b[1]];
}

export function vec2AddScalar(v: Vec2, s: number): Vec2 {
	return [v[0] + s, v[1] + s];
}

export function vec2AddScaled(a: Vec2, b: Vec2, s: number): Vec2 {
	return [a[0] + b[0] * s, a[1] + b[1] * s];
}

/**
 * Computes the angle in radians of the vector from the positive x-axis, in the
 * range (-π, π].
 */
export function vec2Angle(v: Vec2): number {
	return Math.atan2(v[1], v[0]);
}

/**
 * Computes the angle in radians between two vectors. The result is in the range
 * (-π, π].
 */
export function vec2AngleTo(v1: Vec2, v2: Vec2): number {
	return Math.atan2(vec2Cross(v1, v2), vec2Dot(v1, v2));
}

export function vec2ApplyMat2(v: Vec2, m: Mat2x2): Vec2 {
	return [
		sumOfProducts(v[0], m[0][0], v[1], m[0][1]),
		sumOfProducts(v[0], m[1][0], v[1], m[1][1]),
	];
}

export function vec2ApplyMat3(v: Vec2, m: Mat3x3): Vec2 {
	// The homogeneous 1 makes the translation column a third term of the dot.
	const homogeneous = [v[0], v[1], 1];

	return [dotPrecise(homogeneous, m[0]), dotPrecise(homogeneous, m[1])];
}

export function vec2Clamp(v: Vec2, min: Vec2, max: Vec2): Vec2 {
	return [clamp(v[0], min[0], max[0]), clamp(v[1], min[1], max[1])];
}

export function vec2ClampLength(
	v: Vec2,
	minLength: number,
	maxLength: number,
): Vec2 {
	const length = vec2Length(v);
	if (length === 0) {
		return v; // Can't scale a zero-length vector
	}

	const clampedLength = clamp(length, minLength, maxLength);

	return vec2MultiplyScalar(v, clampedLength / length);
}

export function vec2ClampScalar(v: Vec2, min: number, max: number): Vec2 {
	return [clamp(v[0], min, max), clamp(v[1], min, max)];
}

export function vec2Cross(a: Vec2, b: Vec2): number {
	return diffOfProducts(a[0], b[1], a[1], b[0]);
}

export function vec2DistanceTo(
	a: Vec2,
	b: Vec2,
	type: DistanceType = "euclidean",
): number {
	switch (type) {
		case "euclidean":
			return Math.hypot(a[0] - b[0], a[1] - b[1]);
		case "manhattan":
			return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
		case "chebyshev":
			return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
	}
}

export function vec2DistanceToSq(a: Vec2, b: Vec2): number {
	const dx = a[0] - b[0];
	const dy = a[1] - b[1];
	return dx * dx + dy * dy;
}

export function vec2Divide(a: Vec2, b: Vec2): Vec2 {
	return [a[0] / b[0], a[1] / b[1]];
}

export function vec2DivideScalar(v: Vec2, s: number): Vec2 {
	return [v[0] / s, v[1] / s];
}

export function vec2Dot(a: Vec2, b: Vec2): number {
	return sumOfProducts(a[0], b[0], a[1], b[1]);
}

/** Exact component-wise equality. See {@link vec2IsClose} for a tolerant test. */
export function vec2Equals(a: Vec2, b: Vec2): boolean {
	return a[0] === b[0] && a[1] === b[1];
}

/**
 * Component-wise approximate equality.
 *
 * Not transitive, so it is not an equality in the sense a `Set` or `Map` needs,
 * and never a basis for ordering — use {@link vec2Equals} there. `tolerance` is
 * required: a vector carries no units of its own, so only the caller knows what
 * counts as close.
 */
export function vec2IsClose(
	a: Vec2,
	b: Vec2,
	tolerance: IsCloseToOptions,
): boolean {
	return isCloseTo(a[0], b[0], tolerance) && isCloseTo(a[1], b[1], tolerance);
}

/**
 * Creates a 2D vector from an angle in radians. The resulting vector will have
 * a length of 1 and point in the direction of the given angle.
 *
 * @param angle The angle in radians from the positive x-axis.
 */
export function vec2FromAngle(angle: number): Vec2 {
	return [Math.cos(angle), Math.sin(angle)];
}

export function vec2Length(v: Vec2, type: DistanceType = "euclidean"): number {
	switch (type) {
		case "euclidean":
			// Euclidean length is the square root of the sum of the squares of the components
			return Math.hypot(v[0], v[1]);
		case "manhattan":
			// Manhattan length is the sum of the absolute values of the components
			return Math.abs(v[0]) + Math.abs(v[1]);
		case "chebyshev":
			// Chebyshev length is the maximum of the absolute values of the components
			return Math.max(Math.abs(v[0]), Math.abs(v[1]));
	}
}

export function vec2LengthSq(v: Vec2): number {
	return vec2Dot(v, v);
}

export function vec2Lerp(a: Vec2, b: Vec2, t: number): Vec2 {
	return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

export function vec2Max(a: Vec2, b: Vec2): Vec2 {
	return [Math.max(a[0], b[0]), Math.max(a[1], b[1])];
}

export function vec2Min(a: Vec2, b: Vec2): Vec2 {
	return [Math.min(a[0], b[0]), Math.min(a[1], b[1])];
}

export function vec2Minmax(vs: readonly Vec2[]): { min: Vec2; max: Vec2 } {
	let minX = Infinity,
		minY = Infinity;
	let maxX = -Infinity,
		maxY = -Infinity;
	for (const v of vs) {
		if (v[0] < minX) minX = v[0];
		if (v[1] < minY) minY = v[1];
		if (v[0] > maxX) maxX = v[0];
		if (v[1] > maxY) maxY = v[1];
	}
	return { min: [minX, minY], max: [maxX, maxY] };
}

export function vec2Multiply(a: Vec2, b: Vec2): Vec2 {
	return [a[0] * b[0], a[1] * b[1]];
}

export function vec2MultiplyScalar(v: Vec2, s: number): Vec2 {
	return [v[0] * s, v[1] * s];
}

export function vec2Negate(v: Vec2): Vec2 {
	return [-v[0], -v[1]];
}

export function vec2Normalize(v: Vec2): Vec2 {
	const length = vec2Length(v);
	if (length === 0) {
		throw new Error("Cannot normalize a zero-length vector.");
	}
	return vec2DivideScalar(v, length);
}

/**
 * Computes a vector that is perpendicular to the given 2D vector. The result is
 * rotated 90 degrees counter-clockwise.
 */
export function vec2Perpendicular(v: Vec2): Vec2 {
	return [-v[1], v[0]];
}

/**
 * Projects vector `a` onto vector `b`. The result is a vector that lies on the
 * line defined by `b` and has the same direction as `b`.
 */
export function vec2Project(v: Vec2, onto: Vec2): Vec2 {
	const bLengthSq = vec2LengthSq(onto);
	if (bLengthSq === 0) {
		throw new Error("Cannot project onto a zero-length vector.");
	}
	const scale = vec2Dot(v, onto) / bLengthSq;
	return vec2MultiplyScalar(onto, scale);
}

/**
 * Generates a random 2D unit vector (a vector of length 1) in a random
 * direction.
 *
 * @param randFn Optional random number generator function that returns a number
 *   in the range [0, 1).
 * @returns A random 2D unit vector.
 */
export function vec2Random(randFn?: RandomFn | null): Vec2 {
	const random = randFn ?? Math.random;
	return vec2FromAngle(random() * TWO_PI);
}

/**
 * Reflects a 2D vector `v` across a given normal vector. The normal vector
 * should be normalized (have a length of 1) for correct results.
 */
export function vec2Reflect(v: Vec2, normal: Vec2): Vec2 {
	const dot = vec2Dot(v, normal);
	return vec2Sub(v, vec2MultiplyScalar(normal, 2 * dot));
}

/**
 * Rotates a 2D vector by a given angle in radians. The rotation is
 * counter-clockwise.
 */
export function vec2Rotate(v: Vec2, angle: number): Vec2 {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [
		diffOfProducts(v[0], cos, v[1], sin),
		sumOfProducts(v[0], sin, v[1], cos),
	];
}

export function vec2Round(v: Vec2, options?: RoundOptions): Vec2 {
	return [round(v[0], options), round(v[1], options)];
}

export function vec2Sub(a: Vec2, b: Vec2): Vec2 {
	return [a[0] - b[0], a[1] - b[1]];
}

export function vec2SubScalar(v: Vec2, s: number): Vec2 {
	return [v[0] - s, v[1] - s];
}

export function vec2SubScaled(a: Vec2, b: Vec2, s: number): Vec2 {
	return [a[0] - b[0] * s, a[1] - b[1] * s];
}

/**
 * Spherical linear interpolation between two 2D unit vectors along the arc of
 * the unit circle. Both `a` and `b` should be unit-length for correct results.
 */
export function vec2Slerp(a: Vec2, b: Vec2, t: number): Vec2 {
	const angleA = vec2Angle(a);
	const angleB = vec2Angle(b);
	// Normalize delta to (-π, π] (inlined angleNormalizeRad)
	const rawDelta = angleB - angleA;
	const delta = mod(rawDelta + Math.PI, TWO_PI) - Math.PI;
	const angle = angleA + delta * t;
	const r = lerp(vec2Length(a), vec2Length(b), t);
	return [r * Math.cos(angle), r * Math.sin(angle)];
}

export function vec2WeightedMean<T>(
	items: readonly T[],
	getWeightedValue: (item: T) => [v: Vec2, w: number],
): Vec2 {
	const x = new PreciseSum();
	const y = new PreciseSum();
	const totalWeight = new PreciseSum();

	for (const item of items) {
		const [vec, w] = getWeightedValue(item);

		x.add(vec[0] * w);
		y.add(vec[1] * w);
		totalWeight.add(w);
	}

	const weight = totalWeight.value;

	return [x.value / weight, y.value / weight];
}
