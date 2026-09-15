import {
	clamp,
	compareNaturalAscending,
	isCloseAbsolute,
	round,
	type ComparatorResult,
	type RoundOptions,
} from "@ac-kit/core";
import type { DistanceType } from "@ac-kit/math-linear";
import { Vec3 } from "@ac-kit/math-linear";

import { geometryConfig } from "./globals.js";

export type Point3<T extends bigint | number | string | null = number> = {
	x: T;
	y: T;
	z: T;
};

export function point3Clamp(p: Point3, min: Point3, max: Point3): Point3 {
	return {
		x: clamp(p.x, min.x, max.x),
		y: clamp(p.y, min.y, max.y),
		z: clamp(p.z, min.z, max.z),
	};
}

export function point3DisplacementTo(pA: Point3, pB: Point3): Vec3 {
	return [pB.x - pA.x, pB.y - pA.y, pB.z - pA.z];
}

export function point3Distance(
	pA: Point3,
	pB: Point3,
	type: DistanceType = "euclidean",
): number {
	const dx = Math.abs(pB.x - pA.x);
	const dy = Math.abs(pB.y - pA.y);
	const dz = Math.abs(pB.z - pA.z);
	switch (type) {
		case "manhattan":
			return dx + dy + dz;
		case "chebyshev":
			return Math.max(dx, dy, dz);
		case "euclidean":
			return Math.hypot(dx, dy, dz);
	}
}

/**
 * Exact coordinate equality.
 *
 * Transitive, and therefore the one to use as a set or map key, or to dedupe
 * with. `compare(a, b) === 0` under {@link point3CompareLexicographic} agrees
 * with it exactly. See {@link point3IsClose} for a tolerant test.
 */
export function point3Equals(pA: Point3, pB: Point3): boolean {
	return pA.x === pB.x && pA.y === pB.y && pA.z === pB.z;
}

/**
 * Whether every coordinate is within `tolerance` of its counterpart, in the
 * caller's own units.
 *
 * Not transitive, so it is not an equality in the sense a `Set` or `Map` needs,
 * and never a basis for ordering — use {@link point3Equals} there.
 */
export function point3IsClose(
	pA: Point3,
	pB: Point3,
	tolerance: number = geometryConfig.defaultLinearTolerance,
): boolean {
	return (
		isCloseAbsolute(pA.x, pB.x, tolerance) &&
		isCloseAbsolute(pA.y, pB.y, tolerance) &&
		isCloseAbsolute(pA.z, pB.z, tolerance)
	);
}

/**
 * Arbitrary but deterministic total order on points, by `x`, then `y`, then
 * `z`.
 *
 * Not a geometric ordering — no such thing exists in space. It is the canonical
 * order hull and triangulation algorithms sort by, and the way to put points in
 * an ordered container. Exact, so it agrees with {@link point3Equals}.
 */
export function point3CompareLexicographic(
	pA: Point3,
	pB: Point3,
): ComparatorResult {
	return (
		compareNaturalAscending(pA.x, pB.x) ||
		compareNaturalAscending(pA.y, pB.y) ||
		compareNaturalAscending(pA.z, pB.z)
	);
}

export function point3Lerp(pA: Point3, pB: Point3, t: number): Point3 {
	return {
		x: pA.x + (pB.x - pA.x) * t,
		y: pA.y + (pB.y - pA.y) * t,
		z: pA.z + (pB.z - pA.z) * t,
	};
}

export function point3Max(pA: Point3, pB: Point3): Point3 {
	return {
		x: Math.max(pA.x, pB.x),
		y: Math.max(pA.y, pB.y),
		z: Math.max(pA.z, pB.z),
	};
}

export function point3Midpoint(pA: Point3, pB: Point3): Point3 {
	return {
		x: (pA.x + pB.x) / 2,
		y: (pA.y + pB.y) / 2,
		z: (pA.z + pB.z) / 2,
	};
}

export function point3Min(pA: Point3, pB: Point3): Point3 {
	return {
		x: Math.min(pA.x, pB.x),
		y: Math.min(pA.y, pB.y),
		z: Math.min(pA.z, pB.z),
	};
}

export function point3Round(p: Point3, options?: RoundOptions): Point3 {
	return {
		x: round(p.x, options),
		y: round(p.y, options),
		z: round(p.z, options),
	};
}

export function point3Translate(p: Point3, v: Vec3): Point3 {
	return {
		x: p.x + v[0],
		y: p.y + v[1],
		z: p.z + v[2],
	};
}
