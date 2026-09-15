import {
	Vec3,
	vec3Cross,
	vec3Dot,
	vec3Length,
	vec3Normalize,
} from "@ac-kit/math-linear";

import { Point3, point3Equals } from "./point3.js";

export type Triangle3 = {
	a: Point3;
	b: Point3;
	c: Point3;
};

export function triangle3Area(t: Triangle3): number {
	const ab: Vec3 = [t.b.x - t.a.x, t.b.y - t.a.y, t.b.z - t.a.z];
	const ac: Vec3 = [t.c.x - t.a.x, t.c.y - t.a.y, t.c.z - t.a.z];
	return vec3Length(vec3Cross(ab, ac)) / 2;
}

export function triangle3Centroid(t: Triangle3): Point3 {
	return {
		x: (t.a.x + t.b.x + t.c.x) / 3,
		y: (t.a.y + t.b.y + t.c.y) / 3,
		z: (t.a.z + t.b.z + t.c.z) / 3,
	};
}

/**
 * Tests whether `p` lies inside or on the boundary of the triangle. `p` must be
 * coplanar with the triangle for a meaningful result. Uses barycentric
 * coordinates computed via the cross product method.
 */
export function triangle3ContainsPoint(t: Triangle3, p: Point3): boolean {
	const ab: Vec3 = [t.b.x - t.a.x, t.b.y - t.a.y, t.b.z - t.a.z];
	const ac: Vec3 = [t.c.x - t.a.x, t.c.y - t.a.y, t.c.z - t.a.z];
	const ap: Vec3 = [p.x - t.a.x, p.y - t.a.y, p.z - t.a.z];
	const n = vec3Cross(ab, ac);
	const areaABC = vec3Dot(n, n);
	if (areaABC === 0) {
		return false; // degenerate triangle
	}
	const u = vec3Dot(vec3Cross(ab, ap), n) / areaABC;
	const v = vec3Dot(vec3Cross(ap, ac), n) / areaABC;
	return u >= 0 && v >= 0 && u + v <= 1;
}

/** Exact vertex equality, in the order the vertices are stored. */
export function triangle3Equals(a: Triangle3, b: Triangle3): boolean {
	return (
		point3Equals(a.a, b.a) && point3Equals(a.b, b.b) && point3Equals(a.c, b.c)
	);
}

/** Returns the unit face normal of the triangle (right-hand rule: a→b→c). */
export function triangle3Normal(t: Triangle3): Vec3 {
	const ab: Vec3 = [t.b.x - t.a.x, t.b.y - t.a.y, t.b.z - t.a.z];
	const ac: Vec3 = [t.c.x - t.a.x, t.c.y - t.a.y, t.c.z - t.a.z];
	return vec3Normalize(vec3Cross(ab, ac));
}
