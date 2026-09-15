import { Vec2, vec2Dot, vec2Normalize } from "@ac-kit/math-linear";

import { Point2, point2Distance } from "./point2.js";

export type Ray2 = {
	origin: Point2;
	direction: Vec2;
};

/** Returns the point along the ray at parameter `t` (origin + direction * t). */
export function ray2At(ray: Ray2, t: number): Point2 {
	return {
		x: ray.origin.x + ray.direction[0] * t,
		y: ray.origin.y + ray.direction[1] * t,
	};
}

/** Returns the closest point on the ray (t >= 0) to `p`. */
export function ray2ClosestPoint(ray: Ray2, p: Point2): Point2 {
	const d = vec2Normalize(ray.direction);
	const v: Vec2 = [p.x - ray.origin.x, p.y - ray.origin.y];
	const t = Math.max(0, vec2Dot(v, d));
	return { x: ray.origin.x + d[0] * t, y: ray.origin.y + d[1] * t };
}

export function ray2DistanceToPoint(ray: Ray2, p: Point2): number {
	return point2Distance(ray2ClosestPoint(ray, p), p);
}

/** Exact equality of origin and direction. */
export function ray2Equals(a: Ray2, b: Ray2): boolean {
	return (
		a.origin.x === b.origin.x &&
		a.origin.y === b.origin.y &&
		a.direction[0] === b.direction[0] &&
		a.direction[1] === b.direction[1]
	);
}
