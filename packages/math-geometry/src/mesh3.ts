import { PreciseSum } from "@ac-kit/core";
import { Vec3, vec3Length, vec3Normalize } from "@ac-kit/math-linear";

import { Box3 } from "./box3.js";
import { Point3, point3Equals } from "./point3.js";
import {
	Triangle3,
	triangle3Area,
	triangle3Centroid,
	triangle3Normal,
} from "./triangle3.js";

/**
 * Indexed triangle mesh. Vertices are stored once; faces reference them by
 * index (CCW winding). Maps directly to a GPU vertex buffer + index buffer
 * pair.
 */
export type Mesh3 = {
	vertices: readonly Point3[];
	faces: ReadonlyArray<readonly [number, number, number]>;
};

export function mesh3VertexCount(m: Mesh3): number {
	return m.vertices.length;
}

export function mesh3FaceCount(m: Mesh3): number {
	return m.faces.length;
}

export function mesh3FaceTriangle(m: Mesh3, faceIndex: number): Triangle3 {
	const face = m.faces[faceIndex]!;
	return {
		a: m.vertices[face[0]]!,
		b: m.vertices[face[1]]!,
		c: m.vertices[face[2]]!,
	};
}

export function mesh3FaceNormal(m: Mesh3, faceIndex: number): Vec3 {
	return triangle3Normal(mesh3FaceTriangle(m, faceIndex));
}

/**
 * Computes per-vertex smooth normals by accumulating area-weighted face normals
 * and normalizing. Returns one unit normal per vertex, in the same order as
 * `m.vertices`.
 */
export function mesh3VertexNormals(m: Mesh3): Vec3[] {
	const accumulated: Vec3[] = m.vertices.map(() => [0, 0, 0]);
	for (const face of m.faces) {
		const tri = {
			a: m.vertices[face[0]]!,
			b: m.vertices[face[1]]!,
			c: m.vertices[face[2]]!,
		};
		const area = triangle3Area(tri);
		const n = triangle3Normal(tri);
		for (const idx of face) {
			const acc = accumulated[idx]!;
			acc[0] += n[0] * area;
			acc[1] += n[1] * area;
			acc[2] += n[2] * area;
		}
	}
	return accumulated.map((n) => {
		const len = vec3Length(n);
		return len > 0 ? vec3Normalize(n) : ([0, 1, 0] as Vec3);
	});
}

export function mesh3SurfaceArea(m: Mesh3): number {
	let area = 0;
	for (const face of m.faces) {
		area += triangle3Area({
			a: m.vertices[face[0]]!,
			b: m.vertices[face[1]]!,
			c: m.vertices[face[2]]!,
		});
	}
	return area;
}

export function mesh3BoundingBox(m: Mesh3): Box3 {
	let minX = Infinity,
		minY = Infinity,
		minZ = Infinity;
	let maxX = -Infinity,
		maxY = -Infinity,
		maxZ = -Infinity;
	for (const v of m.vertices) {
		if (v.x < minX) minX = v.x;
		if (v.y < minY) minY = v.y;
		if (v.z < minZ) minZ = v.z;
		if (v.x > maxX) maxX = v.x;
		if (v.y > maxY) maxY = v.y;
		if (v.z > maxZ) maxZ = v.z;
	}
	return {
		origin: { x: minX, y: minY, z: minZ },
		size: { width: maxX - minX, height: maxY - minY, depth: maxZ - minZ },
	};
}

/**
 * Returns the surface-area-weighted centroid of the mesh. Falls back to the
 * vertex average for degenerate (zero-area) meshes.
 */
export function mesh3Centroid(m: Mesh3): Point3 {
	const cx = new PreciseSum();
	const cy = new PreciseSum();
	const cz = new PreciseSum();
	const area = new PreciseSum();
	for (const face of m.faces) {
		const tri = {
			a: m.vertices[face[0]]!,
			b: m.vertices[face[1]]!,
			c: m.vertices[face[2]]!,
		};
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
		for (const v of m.vertices) {
			vx.add(v.x);
			vy.add(v.y);
			vz.add(v.z);
		}
		const n = m.vertices.length;
		return { x: vx.value / n, y: vy.value / n, z: vz.value / n };
	}
	return {
		x: cx.value / totalArea,
		y: cy.value / totalArea,
		z: cz.value / totalArea,
	};
}

export function mesh3Equals(a: Mesh3, b: Mesh3): boolean {
	if (
		a.vertices.length !== b.vertices.length ||
		a.faces.length !== b.faces.length
	) {
		return false;
	}
	for (let i = 0; i < a.vertices.length; i++) {
		if (!point3Equals(a.vertices[i]!, b.vertices[i]!)) {
			return false;
		}
	}
	for (let i = 0; i < a.faces.length; i++) {
		const fa = a.faces[i]!;
		const fb = b.faces[i]!;
		if (fa[0] !== fb[0] || fa[1] !== fb[1] || fa[2] !== fb[2]) {
			return false;
		}
	}
	return true;
}
