import { isCloseAbsolute } from "@ac-kit/core";
import { Vec2, vec2LengthSq } from "@ac-kit/math-linear";
import { TWO_PI } from "@ac-kit/math-scalar";

import { geometryConfig } from "./globals.js";
import { Point2, point2IsClose } from "./point2.js";

export type Circle2 = {
	center: Point2;
	radius: number;
};

/**
 * Calculates the area of a 2D circle.
 *
 * @param c - Circle to calculate area for.
 * @returns Area of the circle.
 */
export function circle2Area(c: Circle2): number {
	return Math.PI * c.radius * c.radius;
}

/**
 * Calculates the circumference of a 2D circle.
 *
 * @param c - Circle to calculate circumference for.
 * @returns Circumference of the circle.
 */
export function circle2Circumference(c: Circle2): number {
	return TWO_PI * c.radius;
}

/**
 * Determines whether a point is inside or on the boundary of a 2D circle.
 *
 * Exact: the boundary is measure-zero, so a tolerance would only move it by an
 * arbitrary amount. For deliberate slack, inflate `c.radius` — a length, unlike
 * an epsilon on the squared distance compared here.
 *
 * @param c - Circle to check against.
 * @param p - Point to check.
 * @returns True if the point is inside or on the boundary of the circle, false
 *   otherwise.
 */
export function circle2ContainsPoint(c: Circle2, p: Point2): boolean {
	const distSq = vec2LengthSq([p.x - c.center.x, p.y - c.center.y]);
	const radSq = c.radius * c.radius;

	return distSq <= radSq;
}

/**
 * Determines whether two 2D circles are equal, considering their centers and
 * radii.
 *
 * @param a - First circle to compare.
 * @param b - Second circle to compare.
 * @returns True if the circles are equal, false otherwise.
 */
export function circle2Equals(a: Circle2, b: Circle2): boolean {
	return (
		a.center.x === b.center.x &&
		a.center.y === b.center.y &&
		a.radius === b.radius
	);
}

/**
 * Determines whether two 2D circles are within `tolerance` of each other, in
 * centre and radius.
 *
 * Not transitive, so never a basis for ordering or for a set or map key — use
 * {@link circle2Equals} there.
 *
 * @param a - First circle to compare.
 * @param b - Second circle to compare.
 * @param tolerance - Distance, in the caller's own units.
 * @returns True if the circles are close, false otherwise.
 */
export function circle2IsClose(
	a: Circle2,
	b: Circle2,
	tolerance: number = geometryConfig.defaultLinearTolerance,
): boolean {
	return (
		point2IsClose(a.center, b.center, tolerance) &&
		isCloseAbsolute(a.radius, b.radius, tolerance)
	);
}

/**
 * Determines whether two 2D circles intersect.
 *
 * Exact, for the same reason as {@link circle2ContainsPoint}.
 *
 * @param a - First circle to check for intersection.
 * @param b - Second circle to check for intersection.
 * @returns True if the circles intersect, false otherwise.
 */
export function circle2Intersects(a: Circle2, b: Circle2): boolean {
	const distSq = vec2LengthSq([
		b.center.x - a.center.x,
		b.center.y - a.center.y,
	]);
	const radSum = a.radius + b.radius;

	return distSq <= radSum * radSum;
}

/**
 * Translates a 2D circle by a given vector.
 *
 * @param c - Circle to translate.
 * @param v - Vector by which to translate the circle.
 * @returns A new Circle2 object representing the translated circle.
 */
export function circle2Translate(c: Circle2, v: Vec2): Circle2 {
	return {
		center: { x: c.center.x + v[0], y: c.center.y + v[1] },
		radius: c.radius,
	};
}
