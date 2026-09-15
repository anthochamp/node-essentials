import { PreciseSum } from "@ac-kit/core";
import { Vec2, vec2Minmax } from "@ac-kit/math-linear";
import { diffOfProducts } from "@ac-kit/math-scalar";

import { Point2, point2Distance, point2Equals } from "./point2.js";
import { Rect2 } from "./rect2.js";
import { Triangle2 } from "./triangle2.js";

export type Polygon2 = {
	vertices: readonly Point2[];
};

/**
 * Returns the signed area of the polygon (positive = CCW winding, negative =
 * CW).
 */
export function polygon2SignedArea(p: Polygon2): number {
	const n = p.vertices.length;
	const sum = new PreciseSum();
	for (let i = 0; i < n; i++) {
		const a = p.vertices[i]!;
		const b = p.vertices[(i + 1) % n]!;
		sum.add(diffOfProducts(a.x, b.y, b.x, a.y));
	}
	return sum.value / 2;
}

export function polygon2Area(p: Polygon2): number {
	return Math.abs(polygon2SignedArea(p));
}

export function polygon2Perimeter(p: Polygon2): number {
	const n = p.vertices.length;
	let perimeter = 0;
	for (let i = 0; i < n; i++) {
		perimeter += point2Distance(p.vertices[i]!, p.vertices[(i + 1) % n]!);
	}
	return perimeter;
}

export function polygon2Centroid(p: Polygon2): Point2 {
	const n = p.vertices.length;
	const cx = new PreciseSum();
	const cy = new PreciseSum();
	const signedArea = new PreciseSum();
	for (let i = 0; i < n; i++) {
		const a = p.vertices[i]!;
		const b = p.vertices[(i + 1) % n]!;
		const cross = diffOfProducts(a.x, b.y, b.x, a.y);
		cx.add((a.x + b.x) * cross);
		cy.add((a.y + b.y) * cross);
		signedArea.add(cross);
	}
	const area = signedArea.value;
	if (area === 0) {
		const vx = new PreciseSum();
		const vy = new PreciseSum();
		for (const v of p.vertices) {
			vx.add(v.x);
			vy.add(v.y);
		}
		return { x: vx.value / n, y: vy.value / n };
	}
	return { x: cx.value / (3 * area), y: cy.value / (3 * area) };
}

/**
 * Tests whether `point` lies inside the polygon using the ray casting
 * algorithm. Points exactly on the boundary may give inconsistent results.
 */
export function polygon2ContainsPoint(p: Polygon2, point: Point2): boolean {
	const n = p.vertices.length;
	let inside = false;
	for (let i = 0, j = n - 1; i < n; j = i++) {
		const vi = p.vertices[i]!;
		const vj = p.vertices[j]!;
		if (
			vi.y > point.y !== vj.y > point.y &&
			point.x < ((vj.x - vi.x) * (point.y - vi.y)) / (vj.y - vi.y) + vi.x
		) {
			inside = !inside;
		}
	}
	return inside;
}

/** Returns `true` if all interior angles are convex (no reflex vertices). */
export function polygon2IsConvex(p: Polygon2): boolean {
	const n = p.vertices.length;
	if (n < 3) {
		return false;
	}
	let sign = 0;
	for (let i = 0; i < n; i++) {
		const a = p.vertices[i]!;
		const b = p.vertices[(i + 1) % n]!;
		const c = p.vertices[(i + 2) % n]!;
		const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
		if (cross !== 0) {
			if (sign === 0) {
				sign = cross > 0 ? 1 : -1;
			} else if ((cross > 0 ? 1 : -1) !== sign) {
				return false;
			}
		}
	}
	return true;
}

export function polygon2BoundingBox(p: Polygon2): Rect2 {
	const { min, max } = vec2Minmax(p.vertices.map((v): Vec2 => [v.x, v.y]));
	return {
		origin: { x: min[0], y: min[1] },
		size: { width: max[0] - min[0], height: max[1] - min[1] },
	};
}

/** Exact vertex-by-vertex equality, in the order the vertices are stored. */
export function polygon2Equals(a: Polygon2, b: Polygon2): boolean {
	if (a.vertices.length !== b.vertices.length) {
		return false;
	}
	for (let i = 0; i < a.vertices.length; i++) {
		if (!point2Equals(a.vertices[i]!, b.vertices[i]!)) {
			return false;
		}
	}
	return true;
}

/**
 * Fan-triangulates the polygon from vertex 0. Only produces correct results for
 * convex polygons or polygons star-shaped with respect to vertex 0.
 */
export function polygon2Triangulate(p: Polygon2): Triangle2[] {
	const triangles: Triangle2[] = [];
	const n = p.vertices.length;
	const v0 = p.vertices[0]!;
	for (let i = 1; i < n - 1; i++) {
		triangles.push({ a: v0, b: p.vertices[i]!, c: p.vertices[i + 1]! });
	}
	return triangles;
}
