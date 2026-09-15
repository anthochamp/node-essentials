import { dotPrecise } from "@ac-kit/math-scalar";

import { Point3, point3Distance, point3Equals } from "./point3.js";

export type Segment3 = {
	a: Point3;
	b: Point3;
};

/** Returns the closest point on the segment to `p`. */
export function segment3ClosestPoint(seg: Segment3, p: Point3): Point3 {
	const dx = seg.b.x - seg.a.x;
	const dy = seg.b.y - seg.a.y;
	const dz = seg.b.z - seg.a.z;
	const lenSq = dx * dx + dy * dy + dz * dz;
	if (lenSq === 0) {
		return seg.a; // degenerate segment
	}
	const t = Math.max(
		0,
		Math.min(
			1,
			dotPrecise([p.x - seg.a.x, p.y - seg.a.y, p.z - seg.a.z], [dx, dy, dz]) /
				lenSq,
		),
	);
	return { x: seg.a.x + t * dx, y: seg.a.y + t * dy, z: seg.a.z + t * dz };
}

export function segment3DistanceToPoint(seg: Segment3, p: Point3): number {
	return point3Distance(segment3ClosestPoint(seg, p), p);
}

/** Exact endpoint equality. A segment and its reverse are not equal. */
export function segment3Equals(a: Segment3, b: Segment3): boolean {
	return point3Equals(a.a, b.a) && point3Equals(a.b, b.b);
}

export function segment3Length(seg: Segment3): number {
	return point3Distance(seg.a, seg.b);
}

export function segment3Midpoint(seg: Segment3): Point3 {
	return {
		x: (seg.a.x + seg.b.x) / 2,
		y: (seg.a.y + seg.b.y) / 2,
		z: (seg.a.z + seg.b.z) / 2,
	};
}
