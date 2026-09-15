import { Vec3, vec3Dot, vec3Normalize } from "@ac-kit/math-linear";
import { diffOfProducts } from "@ac-kit/math-scalar";

import { geometryConfig } from "./globals.js";
import { Plane3 } from "./plane3.js";
import { Point3, point3Distance } from "./point3.js";
import { Sphere3 } from "./sphere3.js";

export type Ray3 = {
	origin: Point3;
	direction: Vec3;
};

/** Returns the point along the ray at parameter `t` (origin + direction * t). */
export function ray3At(ray: Ray3, t: number): Point3 {
	return {
		x: ray.origin.x + ray.direction[0] * t,
		y: ray.origin.y + ray.direction[1] * t,
		z: ray.origin.z + ray.direction[2] * t,
	};
}

/** Returns the closest point on the ray (t >= 0) to `p`. */
export function ray3ClosestPoint(ray: Ray3, p: Point3): Point3 {
	const d = vec3Normalize(ray.direction);
	const v: Vec3 = [p.x - ray.origin.x, p.y - ray.origin.y, p.z - ray.origin.z];
	const t = Math.max(0, vec3Dot(v, d));
	return {
		x: ray.origin.x + d[0] * t,
		y: ray.origin.y + d[1] * t,
		z: ray.origin.z + d[2] * t,
	};
}

export function ray3DistanceToPoint(ray: Ray3, p: Point3): number {
	return point3Distance(ray3ClosestPoint(ray, p), p);
}

/** Exact equality of origin and direction. */
export function ray3Equals(a: Ray3, b: Ray3): boolean {
	return (
		a.origin.x === b.origin.x &&
		a.origin.y === b.origin.y &&
		a.origin.z === b.origin.z &&
		a.direction[0] === b.direction[0] &&
		a.direction[1] === b.direction[1] &&
		a.direction[2] === b.direction[2]
	);
}

/**
 * Returns the intersection point of the ray with the plane, or `null` if
 * parallel or behind the ray.
 *
 * @param tolerance - Dimensionless bound on the dot product of the ray
 *   direction and the plane normal, below which the two count as parallel. Both
 *   are unit-length, so the raw dot product is already scale-free.
 */
export function ray3IntersectPlane(
	ray: Ray3,
	plane: Plane3,
	tolerance: number = geometryConfig.defaultAngularTolerance,
): Point3 | null {
	const d = vec3Dot(ray.direction, plane.normal);
	if (Math.abs(d) <= tolerance) {
		return null; // ray is parallel to plane
	}
	const t =
		(plane.distance -
			vec3Dot(plane.normal, [ray.origin.x, ray.origin.y, ray.origin.z])) /
		d;
	if (t < 0) {
		return null; // intersection is behind the ray
	}
	return ray3At(ray, t);
}

/**
 * Returns the first intersection point of the ray with the sphere (nearest to
 * origin), or `null` if no intersection.
 */
export function ray3IntersectSphere(ray: Ray3, sphere: Sphere3): Point3 | null {
	const d = ray.direction;
	const oc: Vec3 = [
		ray.origin.x - sphere.center[0],
		ray.origin.y - sphere.center[1],
		ray.origin.z - sphere.center[2],
	];
	const a = vec3Dot(d, d);
	const b = 2 * vec3Dot(oc, d);
	const c = vec3Dot(oc, oc) - sphere.radius * sphere.radius;
	const discriminant = diffOfProducts(b, b, 4 * a, c);
	if (discriminant < 0) {
		return null;
	}
	const t = (-b - Math.sqrt(discriminant)) / (2 * a);
	if (t < 0) {
		return null;
	}
	return ray3At(ray, t);
}
