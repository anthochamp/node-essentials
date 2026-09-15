import { clamp } from "@ac-kit/core";
import { diffOfProducts, sumOfProducts } from "@ac-kit/math-scalar";

import { geometryConfig } from "./globals.js";
import { Point2, point2Distance, point2Equals } from "./point2.js";

export type Segment2 = {
	a: Point2;
	b: Point2;
};

/** Returns the closest point on the segment to `p`. */
export function segment2ClosestPoint(seg: Segment2, p: Point2): Point2 {
	const dx = seg.b.x - seg.a.x;
	const dy = seg.b.y - seg.a.y;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) {
		return seg.a; // degenerate segment
	}
	const t = clamp(
		sumOfProducts(p.x - seg.a.x, dx, p.y - seg.a.y, dy) / lenSq,
		0,
		1,
	);
	return { x: seg.a.x + t * dx, y: seg.a.y + t * dy };
}

export function segment2DistanceToPoint(seg: Segment2, p: Point2): number {
	return point2Distance(segment2ClosestPoint(seg, p), p);
}

export function segment2Equals(a: Segment2, b: Segment2): boolean {
	return point2Equals(a.a, b.a) && point2Equals(a.b, b.b);
}

/**
 * Returns the intersection point of two line segments, or `null` if they do not
 * intersect.
 *
 * The parallel test scales the cross product by both segment lengths, so it is
 * an angular threshold rather than a raw one — rescaling either segment leaves
 * the answer unchanged, which a bare bound on `denom` would not.
 *
 * @param tolerance - Dimensionless bound on `sin` of the angle between the two
 *   segments, below which they count as parallel.
 */
export function segment2Intersect(
	a: Segment2,
	b: Segment2,
	tolerance: number = geometryConfig.defaultAngularTolerance,
): Point2 | null {
	const dx1 = a.b.x - a.a.x,
		dy1 = a.b.y - a.a.y;
	const dx2 = b.b.x - b.a.x,
		dy2 = b.b.y - b.a.y;
	const denom = diffOfProducts(dx1, dy2, dy1, dx2);
	const scale = Math.hypot(dx1, dy1) * Math.hypot(dx2, dy2);
	if (Math.abs(denom) <= tolerance * scale) {
		return null; // parallel, or a degenerate zero-length segment
	}
	const dx = b.a.x - a.a.x,
		dy = b.a.y - a.a.y;
	const t = diffOfProducts(dx, dy2, dy, dx2) / denom;
	const u = diffOfProducts(dx, dy1, dy, dx1) / denom;
	if (t < 0 || t > 1 || u < 0 || u > 1) {
		return null;
	}
	return { x: a.a.x + t * dx1, y: a.a.y + t * dy1 };
}

export function segment2Length(seg: Segment2): number {
	return point2Distance(seg.a, seg.b);
}

export function segment2Midpoint(seg: Segment2): Point2 {
	return { x: (seg.a.x + seg.b.x) / 2, y: (seg.a.y + seg.b.y) / 2 };
}
