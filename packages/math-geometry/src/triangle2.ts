import { diffOfProducts } from "@ac-kit/math-scalar";

import { Point2, point2Distance, point2Equals } from "./point2.js";

export type Triangle2 = {
	a: Point2;
	b: Point2;
	c: Point2;
};

export function triangle2Area(t: Triangle2): number {
	// Shoelace formula — returns the absolute area
	return (
		Math.abs(
			diffOfProducts(
				t.b.x - t.a.x,
				t.c.y - t.a.y,
				t.c.x - t.a.x,
				t.b.y - t.a.y,
			),
		) / 2
	);
}

export function triangle2Centroid(t: Triangle2): Point2 {
	return { x: (t.a.x + t.b.x + t.c.x) / 3, y: (t.a.y + t.b.y + t.c.y) / 3 };
}

/**
 * Tests whether `p` lies inside or on the boundary of the triangle using
 * barycentric coordinates.
 */
export function triangle2ContainsPoint(t: Triangle2, p: Point2): boolean {
	const d1 = diffOfProducts(
		p.x - t.b.x,
		t.a.y - t.b.y,
		t.a.x - t.b.x,
		p.y - t.b.y,
	);
	const d2 = diffOfProducts(
		p.x - t.c.x,
		t.b.y - t.c.y,
		t.b.x - t.c.x,
		p.y - t.c.y,
	);
	const d3 = diffOfProducts(
		p.x - t.a.x,
		t.c.y - t.a.y,
		t.c.x - t.a.x,
		p.y - t.a.y,
	);
	const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
	const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
	return !(hasNeg && hasPos);
}

/** Exact vertex equality, in the order the vertices are stored. */
export function triangle2Equals(a: Triangle2, b: Triangle2): boolean {
	return (
		point2Equals(a.a, b.a) && point2Equals(a.b, b.b) && point2Equals(a.c, b.c)
	);
}

export function triangle2Perimeter(t: Triangle2): number {
	return (
		point2Distance(t.a, t.b) +
		point2Distance(t.b, t.c) +
		point2Distance(t.c, t.a)
	);
}
