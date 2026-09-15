import { isCloseAbsolute } from "@ac-kit/core";
import {
	Vec3,
	vec3Dot,
	vec3Length,
	vec3MultiplyScalar,
	vec3Normalize,
	vec3Sub,
} from "@ac-kit/math-linear";

import { geometryConfig } from "./globals.js";

export type Plane3 = {
	/** Unit normal vector pointing away from the plane's surface. */
	normal: Vec3;
	/** Signed distance from the origin to the plane along the normal. */
	distance: number;
};

/**
 * Returns the signed distance from the plane to `p`. Positive if `p` is on the
 * normal side.
 */
export function plane3DistanceToPoint(plane: Plane3, p: Vec3): number {
	return vec3Dot(plane.normal, p) - plane.distance;
}

/**
 * Whether `p` lies on `plane`, within `tolerance` of it.
 *
 * Tolerant by necessity: a plane has zero volume, so no constructed point ever
 * lands on one exactly. `tolerance` is a distance in the caller's own units,
 * which is the only form defined here — the signed distance is compared against
 * zero, where a relative or ULP bound degenerates to exact equality.
 */
export function plane3ContainsPoint(
	plane: Plane3,
	p: Vec3,
	tolerance: number = geometryConfig.defaultLinearTolerance,
): boolean {
	return isCloseAbsolute(plane3DistanceToPoint(plane, p), 0, tolerance);
}

/**
 * Exact equality of normal and distance.
 *
 * Compares the representation, not the geometry: a plane and its flip describe
 * the same surface but are not equal.
 */
export function plane3Equals(a: Plane3, b: Plane3): boolean {
	return (
		a.normal[0] === b.normal[0] &&
		a.normal[1] === b.normal[1] &&
		a.normal[2] === b.normal[2] &&
		a.distance === b.distance
	);
}

/** Returns a new plane with the normal and distance sign flipped. */
export function plane3Flip(plane: Plane3): Plane3 {
	return {
		normal: [-plane.normal[0], -plane.normal[1], -plane.normal[2]],
		distance: -plane.distance,
	};
}

/**
 * Normalizes the plane so that `normal` is a unit vector. If `normal` is
 * already a unit vector, this is a no-op.
 */
export function plane3Normalize(plane: Plane3): Plane3 {
	const len = vec3Length(plane.normal);
	if (len === 0) {
		throw new Error("Cannot normalize a plane with a zero-length normal.");
	}
	return {
		normal: vec3Normalize(plane.normal),
		distance: plane.distance / len,
	};
}

/** Projects `p` onto the plane (closest point on the plane to `p`). */
export function plane3ProjectPoint(plane: Plane3, p: Vec3): Vec3 {
	const dist = plane3DistanceToPoint(plane, p);
	return vec3Sub(p, vec3MultiplyScalar(plane.normal, dist));
}
