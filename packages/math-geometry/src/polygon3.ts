import { PreciseSum } from "@ac-kit/core";
import {
	Vec3,
	vec3Length,
	vec3Minmax,
	vec3Normalize,
} from "@ac-kit/math-linear";

import { Box3 } from "./box3.js";
import { Point3, point3Distance, point3Equals } from "./point3.js";
import { Triangle3, triangle3Area, triangle3Centroid } from "./triangle3.js";

export type Polygon3 = {
	vertices: readonly Point3[];
};

/** Computes the Newell normal vector (unnormalized, magnitude = 2 * area). */
function newellVector_(p: Polygon3): Vec3 {
	const nx = new PreciseSum();
	const ny = new PreciseSum();
	const nz = new PreciseSum();
	const n = p.vertices.length;
	for (let i = 0; i < n; i++) {
		const a = p.vertices[i]!;
		const b = p.vertices[(i + 1) % n]!;
		nx.add((a.y - b.y) * (a.z + b.z));
		ny.add((a.z - b.z) * (a.x + b.x));
		nz.add((a.x - b.x) * (a.y + b.y));
	}
	return [nx.value, ny.value, nz.value];
}

export function polygon3Area(p: Polygon3): number {
	return vec3Length(newellVector_(p)) / 2;
}

/**
 * Returns the unit face normal using Newell's method. Works correctly for
 * non-planar polygons (returns best-fit normal).
 */
export function polygon3Normal(p: Polygon3): Vec3 {
	return vec3Normalize(newellVector_(p));
}

export function polygon3Perimeter(p: Polygon3): number {
	const n = p.vertices.length;
	let perimeter = 0;
	for (let i = 0; i < n; i++) {
		perimeter += point3Distance(p.vertices[i]!, p.vertices[(i + 1) % n]!);
	}
	return perimeter;
}

/**
 * Returns the area-weighted centroid via fan triangulation from vertex 0. Falls
 * back to the vertex average for degenerate (zero-area) polygons.
 */
export function polygon3Centroid(p: Polygon3): Point3 {
	const cx = new PreciseSum();
	const cy = new PreciseSum();
	const cz = new PreciseSum();
	const area = new PreciseSum();
	const n = p.vertices.length;
	const v0 = p.vertices[0]!;
	for (let i = 1; i < n - 1; i++) {
		const tri: Triangle3 = { a: v0, b: p.vertices[i]!, c: p.vertices[i + 1]! };
		const triArea = triangle3Area(tri);
		const c = triangle3Centroid(tri);
		cx.add(c.x * triArea);
		cy.add(c.y * triArea);
		cz.add(c.z * triArea);
		area.add(triArea);
	}
	const totalArea = area.value;
	if (totalArea === 0) {
		const vx = new PreciseSum();
		const vy = new PreciseSum();
		const vz = new PreciseSum();
		for (const v of p.vertices) {
			vx.add(v.x);
			vy.add(v.y);
			vz.add(v.z);
		}
		return { x: vx.value / n, y: vy.value / n, z: vz.value / n };
	}
	return {
		x: cx.value / totalArea,
		y: cy.value / totalArea,
		z: cz.value / totalArea,
	};
}

export function polygon3BoundingBox(p: Polygon3): Box3 {
	const { min, max } = vec3Minmax(p.vertices.map((v): Vec3 => [v.x, v.y, v.z]));
	return {
		origin: { x: min[0], y: min[1], z: min[2] },
		size: {
			width: max[0] - min[0],
			height: max[1] - min[1],
			depth: max[2] - min[2],
		},
	};
}

/** Exact vertex-by-vertex equality, in the order the vertices are stored. */
export function polygon3Equals(a: Polygon3, b: Polygon3): boolean {
	if (a.vertices.length !== b.vertices.length) {
		return false;
	}
	for (let i = 0; i < a.vertices.length; i++) {
		if (!point3Equals(a.vertices[i]!, b.vertices[i]!)) {
			return false;
		}
	}
	return true;
}

/**
 * Fan-triangulates the polygon from vertex 0. Only produces correct results for
 * convex polygons or polygons star-shaped with respect to vertex 0.
 */
export function polygon3Triangulate(p: Polygon3): Triangle3[] {
	const triangles: Triangle3[] = [];
	const n = p.vertices.length;
	const v0 = p.vertices[0]!;
	for (let i = 1; i < n - 1; i++) {
		triangles.push({ a: v0, b: p.vertices[i]!, c: p.vertices[i + 1]! });
	}
	return triangles;
}
