import { isCloseAbsolute } from "@ac-kit/core";
import {
	Vec2,
	vec2Cross,
	vec2Dot,
	vec2Length,
	vec2Normalize,
} from "@ac-kit/math-linear";
import { diffOfProducts } from "@ac-kit/math-scalar";

import { geometryConfig } from "./globals.js";
import { Point2 } from "./point2.js";

export type Line2 = {
	point: Point2;
	direction: Vec2;
};

/** Returns the closest point on the infinite line to `p`. */
export function line2ClosestPoint(line: Line2, p: Point2): Point2 {
	const d = vec2Normalize(line.direction);
	const v: Vec2 = [p.x - line.point.x, p.y - line.point.y];
	const t = vec2Dot(v, d);
	return { x: line.point.x + d[0] * t, y: line.point.y + d[1] * t };
}

/**
 * Whether `p` lies on `line`, within `tolerance` of it.
 *
 * Tolerant by necessity: a line has zero area, so no constructed point ever
 * lands on one exactly. `tolerance` is a distance in the caller's own units.
 */
export function line2ContainsPoint(
	line: Line2,
	p: Point2,
	tolerance: number = geometryConfig.defaultLinearTolerance,
): boolean {
	return line2DistanceToPoint(line, p) <= tolerance;
}

export function line2DistanceToPoint(line: Line2, p: Point2): number {
	const d = vec2Normalize(line.direction);
	const v: Vec2 = [p.x - line.point.x, p.y - line.point.y];
	return Math.abs(vec2Cross(v, d));
}

/**
 * Whether `a` and `b` are the same infinite line, within tolerance.
 *
 * Tolerant rather than exact: the same line can be built from any point on it
 * and any scaling of its direction, so exact component equality would answer a
 * question nobody is asking. Directions are compared through their normalised
 * dot product, and opposite directions denote the same line.
 *
 * @param linearTolerance - Distance, in the caller's units, within which a
 *   point still counts as lying on the other line.
 * @param angularTolerance - Dimensionless residual on `|dot| - 1`, within which
 *   two unit directions still count as collinear.
 */
export function line2Equals(
	a: Line2,
	b: Line2,
	linearTolerance: number = geometryConfig.defaultLinearTolerance,
	angularTolerance: number = geometryConfig.defaultAngularTolerance,
): boolean {
	const dot = vec2Dot(vec2Normalize(a.direction), vec2Normalize(b.direction));

	return (
		isCloseAbsolute(Math.abs(dot), 1, angularTolerance) &&
		line2ContainsPoint(a, b.point, linearTolerance)
	);
}

/**
 * Returns the intersection point of two infinite lines, or `null` if they are
 * parallel.
 *
 * The parallel test scales the cross product by both direction lengths, so it
 * is an angular threshold rather than a raw one — rescaling either direction
 * leaves the answer unchanged, which a bare bound on `denom` would not.
 *
 * @param tolerance - Dimensionless bound on `sin` of the angle between the two
 *   directions, below which they count as parallel.
 */
export function line2Intersect(
	a: Line2,
	b: Line2,
	tolerance: number = geometryConfig.defaultAngularTolerance,
): Point2 | null {
	const [dx1, dy1] = a.direction;
	const [dx2, dy2] = b.direction;
	const denom = diffOfProducts(dx1, dy2, dy1, dx2);
	const scale = vec2Length(a.direction) * vec2Length(b.direction);

	if (Math.abs(denom) <= tolerance * scale) {
		return null; // parallel, or a degenerate zero-length direction
	}

	const dx = b.point.x - a.point.x;
	const dy = b.point.y - a.point.y;
	const t = diffOfProducts(dx, dy2, dy, dx2) / denom;
	return { x: a.point.x + dx1 * t, y: a.point.y + dy1 * t };
}
