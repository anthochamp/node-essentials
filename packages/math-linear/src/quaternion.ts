import {
	type Quaternion,
	QUATERNION_IDENTITY,
	quaternionDot,
	quaternionNormalize,
} from "@ac-kit/math-complex";

import { SLERP_LINEAR_FALLBACK_DOT_ } from "./_slerp.js";
import { Mat4x4 } from "./mat4x4.js";
import { Vec3, vec3Cross, vec3Dot, vec3Length, vec3Normalize } from "./vec3.js";

export type { Quaternion } from "@ac-kit/math-complex";

/**
 * How far `a·b` may sit from `±1` before two unit vectors are taken as
 * collinear, in {@link quaternionFromVec3ToVec3}.
 *
 * That function builds the unnormalised quaternion `[a×b, 1 + a·b]`, whose norm
 * has a closed form for unit `a` and `b`:
 *
 * ```text
 * ‖[a×b, 1 + a·b]‖² = |a×b|² + (1 + a·b)²
 *                     = (1 − dot²) + (1 + 2·dot + dot²)
 *                     = 2·(1 + dot)
 * ```
 *
 * So the norm is `√(2(1 + dot))`, which collapses to `0` as `dot → −1`: both
 * the axis and the scalar part vanish together, and normalising divides one
 * near-zero by another. At this margin the norm is still `√(2e-10) ≈ 1.4e-5`,
 * large enough to divide by; past it the anti-parallel branch takes over.
 *
 * In angle, `1 − cos θ ≈ θ²/2`, so the margin corresponds to `θ ≤ √(2e-10) ≈
 * 1.4e-5 rad` of the parallel case and `θ ≥ π − 1.4e-5 rad` of the
 * anti-parallel one.
 *
 * The parallel side is a shortcut rather than a rescue — there the norm tends
 * to `2` and the general formula would return the identity anyway.
 *
 * Not a tolerance, and deliberately not configurable.
 */
const COLLINEAR_DOT_MARGIN_ = 1e-10;

/**
 * Shortest perpendicular accepted when picking an arbitrary rotation axis for
 * the anti-parallel (180°) case in {@link quaternionFromVec3ToVec3}.
 *
 * That branch tries `a × x̂` first. For unit `a` the length is a sine, `|a ×
 * x̂| = sin φ` with `φ` the angle between `a` and the x-axis, so this bounds `φ
 * ≥ 1e-6 rad`. Below it the cross product has lost its direction and the branch
 * retries against `ŷ`, which cannot also be near-parallel to `a`.
 *
 * Tighter in angle than {@link COLLINEAR_DOT_MARGIN_} despite the larger
 * literal: a sine is linear in the angle where `1 − cos` is quadratic, so
 * `1e-6` here means `1e-6 rad` against the other's `1.4e-5 rad`. The two bound
 * different quantities and their raw values are not comparable.
 */
const PERPENDICULAR_MIN_SINE_ = 1e-6;

/**
 * Smallest `|sin(θ/2)|` at which a quaternion still has a well-defined rotation
 * axis, in {@link quaternionAxis}.
 *
 * For a unit quaternion `q = [v·sin(θ/2), cos(θ/2)]`, the axis is recovered as
 *
 * ```text
 * s = √(1 − qᵤ²) = |sin(θ/2)|
 * v = [qₓ, qᵧ, q_z] / s
 * ```
 *
 * And the numerator is itself of order `s`, so the quotient degenerates into
 * `0/0` as `θ → 0`. The identity rotation genuinely has no axis, so there is
 * nothing to recover and the function returns an arbitrary one.
 *
 * `θ ≈ 2·asin(1e-3) ≈ 2e-3 rad ≈ 0.115°` — far looser than the two margins
 * above because it protects a direction nobody can observe at that angle, not a
 * quantity fed into further arithmetic.
 */
const AXIS_MIN_HALF_ANGLE_SINE_ = 0.001;

export function quaternionAngle(q: Quaternion): number {
	return 2 * Math.acos(q[3]);
}

export function quaternionAxis(q: Quaternion): Vec3 {
	const s = Math.sqrt(1 - q[3] * q[3]);
	if (s < AXIS_MIN_HALF_ANGLE_SINE_) {
		return [1, 0, 0];
	}
	return [q[0] / s, q[1] / s, q[2] / s];
}

export function quaternionFromAxisAngle(axis: Vec3, angle: number): Quaternion {
	const halfAngle = angle / 2;
	const s = Math.sin(halfAngle);
	return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(halfAngle)];
}

/** Converts a rotation matrix to a quaternion. */
export function quaternionFromRotationMatrix(m: Mat4x4): Quaternion {
	const trace = m[0][0] + m[1][1] + m[2][2];
	let x, y, z, w;

	if (trace > 0) {
		const s = 0.5 / Math.sqrt(trace + 1.0);
		w = 0.25 / s;
		x = (m[2][1] - m[1][2]) * s;
		y = (m[0][2] - m[2][0]) * s;
		z = (m[1][0] - m[0][1]) * s;
	} else {
		if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
			const s = 2.0 * Math.sqrt(1.0 + m[0][0] - m[1][1] - m[2][2]);
			w = (m[2][1] - m[1][2]) / s;
			x = 0.25 * s;
			y = (m[0][1] + m[1][0]) / s;
			z = (m[0][2] + m[2][0]) / s;
		} else if (m[1][1] > m[2][2]) {
			const s = 2.0 * Math.sqrt(1.0 + m[1][1] - m[0][0] - m[2][2]);
			w = (m[0][2] - m[2][0]) / s;
			x = (m[0][1] + m[1][0]) / s;
			y = 0.25 * s;
			z = (m[1][2] + m[2][1]) / s;
		} else {
			const s = 2.0 * Math.sqrt(1.0 + m[2][2] - m[0][0] - m[1][1]);
			w = (m[1][0] - m[0][1]) / s;
			x = (m[0][2] + m[2][0]) / s;
			y = (m[1][2] + m[2][1]) / s;
			z = 0.25 * s;
		}
	}

	return [x, y, z, w];
}

/**
 * Creates the shortest-arc quaternion that rotates `from` to `to`. Both vectors
 * must be non-zero; they do not need to be unit-length. Handles the
 * anti-parallel (180°) case by using an arbitrary perpendicular axis.
 */
export function quaternionFromVec3ToVec3(from: Vec3, to: Vec3): Quaternion {
	const fromN = vec3Normalize(from);
	const toN = vec3Normalize(to);
	const dot = vec3Dot(fromN, toN);

	if (dot >= 1 - COLLINEAR_DOT_MARGIN_) {
		// Vectors are parallel — identity rotation
		return QUATERNION_IDENTITY;
	}

	if (dot <= -1 + COLLINEAR_DOT_MARGIN_) {
		// Vectors are anti-parallel — rotate 180° around an arbitrary perpendicular axis
		let perp: Vec3 = vec3Cross(fromN, [1, 0, 0]);
		if (vec3Length(perp) < PERPENDICULAR_MIN_SINE_) {
			perp = vec3Cross(fromN, [0, 1, 0]);
		}
		return quaternionFromAxisAngle(vec3Normalize(perp), Math.PI);
	}

	const axis = vec3Cross(fromN, toN);
	const w = 1 + dot;
	// axis × sin(θ/2), w = cos(θ/2) — unnormalized; quaternionNormalize ensures unit length
	return quaternionNormalize([axis[0], axis[1], axis[2], w]);
}

/**
 * Non-normalized linear interpolation between two quaternions. Faster than
 * slerp but does not preserve unit length — normalize if needed.
 */
export function quaternionLerp(
	q1: Quaternion,
	q2: Quaternion,
	t: number,
): Quaternion {
	const dot = quaternionDot(q1, q2);
	// Negate q2 if dot < 0 to take the shorter path
	const q2s: Quaternion = dot < 0 ? [-q2[0], -q2[1], -q2[2], -q2[3]] : q2;
	return [
		q1[0] + t * (q2s[0] - q1[0]),
		q1[1] + t * (q2s[1] - q1[1]),
		q1[2] + t * (q2s[2] - q1[2]),
		q1[3] + t * (q2s[3] - q1[3]),
	];
}

export function quaternionSlerp(
	q1: Quaternion,
	q2: Quaternion,
	t: number,
): Quaternion {
	// Compute the cosine of the angle between the two quaternions
	let dot = q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];

	// If the dot product is negative, negate one quaternion to take the shorter path
	if (dot < 0.0) {
		q2 = [-q2[0], -q2[1], -q2[2], -q2[3]];
		dot = -dot;
	}

	if (dot > SLERP_LINEAR_FALLBACK_DOT_) {
		const result = [
			q1[0] + t * (q2[0] - q1[0]),
			q1[1] + t * (q2[1] - q1[1]),
			q1[2] + t * (q2[2] - q1[2]),
			q1[3] + t * (q2[3] - q1[3]),
		] as const satisfies Quaternion;
		return quaternionNormalize(result);
	}

	// Calculate the angle between the quaternions
	const theta_0 = Math.acos(dot); // theta_0 = angle between input quaternions
	const theta = theta_0 * t; // theta = angle between q1 and result
	const sin_theta = Math.sin(theta);
	const sin_theta_0 = Math.sin(theta_0);

	const s1 = Math.cos(theta) - (dot * sin_theta) / sin_theta_0;
	const s2 = sin_theta / sin_theta_0;

	return [
		s1 * q1[0] + s2 * q2[0],
		s1 * q1[1] + s2 * q2[1],
		s1 * q1[2] + s2 * q2[2],
		s1 * q1[3] + s2 * q2[3],
	];
}

export function quaternionToRotationMatrix(q: Quaternion): Mat4x4 {
	const x = q[0],
		y = q[1],
		z = q[2],
		w = q[3];

	const xx = x * x;
	const yy = y * y;
	const zz = z * z;
	const xy = x * y;
	const xz = x * z;
	const yz = y * z;
	const wx = w * x;
	const wy = w * y;
	const wz = w * z;

	return [
		[1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy), 0],
		[2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx), 0],
		[2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy), 0],
		[0, 0, 0, 1],
	];
}
