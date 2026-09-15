import { Vec3 } from "@ac-kit/math-linear";

import { Point3, point3Equals } from "./point3.js";
import { Size3, size3Equals, size3Volume } from "./size3.js";

export type Box3 = {
	origin: Point3;
	size: Size3;
};

export function box3Center(b: Box3): Point3 {
	return {
		x: b.origin.x + b.size.width / 2,
		y: b.origin.y + b.size.height / 2,
		z: b.origin.z + b.size.depth / 2,
	};
}

export function box3Contains(container: Box3, contained: Box3): boolean {
	return (
		contained.origin.x >= container.origin.x &&
		contained.origin.x + contained.size.width <=
			container.origin.x + container.size.width &&
		contained.origin.y >= container.origin.y &&
		contained.origin.y + contained.size.height <=
			container.origin.y + container.size.height &&
		contained.origin.z >= container.origin.z &&
		contained.origin.z + contained.size.depth <=
			container.origin.z + container.size.depth
	);
}

export function box3ContainsPoint(b: Box3, p: Point3): boolean {
	return (
		p.x >= b.origin.x &&
		p.x <= b.origin.x + b.size.width &&
		p.y >= b.origin.y &&
		p.y <= b.origin.y + b.size.height &&
		p.z >= b.origin.z &&
		p.z <= b.origin.z + b.size.depth
	);
}

export function box3Equals(a: Box3, b: Box3): boolean {
	return point3Equals(a.origin, b.origin) && size3Equals(a.size, b.size);
}

export function box3Intersects(a: Box3, b: Box3): boolean {
	return !(
		a.origin.x + a.size.width < b.origin.x ||
		b.origin.x + b.size.width < a.origin.x ||
		a.origin.y + a.size.height < b.origin.y ||
		b.origin.y + b.size.height < a.origin.y ||
		a.origin.z + a.size.depth < b.origin.z ||
		b.origin.z + b.size.depth < a.origin.z
	);
}

export function box3Intersection(a: Box3, b: Box3): Box3 | null {
	if (!box3Intersects(a, b)) {
		return null;
	}
	const ox = Math.max(a.origin.x, b.origin.x);
	const oy = Math.max(a.origin.y, b.origin.y);
	const oz = Math.max(a.origin.z, b.origin.z);
	return {
		origin: { x: ox, y: oy, z: oz },
		size: {
			width:
				Math.min(a.origin.x + a.size.width, b.origin.x + b.size.width) - ox,
			height:
				Math.min(a.origin.y + a.size.height, b.origin.y + b.size.height) - oy,
			depth:
				Math.min(a.origin.z + a.size.depth, b.origin.z + b.size.depth) - oz,
		},
	};
}

export function box3Translate(b: Box3, offset: Vec3): Box3 {
	return {
		origin: {
			x: b.origin.x + offset[0],
			y: b.origin.y + offset[1],
			z: b.origin.z + offset[2],
		},
		size: b.size,
	};
}

export function box3Union(a: Box3, b: Box3): Box3 {
	const ox = Math.min(a.origin.x, b.origin.x);
	const oy = Math.min(a.origin.y, b.origin.y);
	const oz = Math.min(a.origin.z, b.origin.z);
	return {
		origin: { x: ox, y: oy, z: oz },
		size: {
			width:
				Math.max(a.origin.x + a.size.width, b.origin.x + b.size.width) - ox,
			height:
				Math.max(a.origin.y + a.size.height, b.origin.y + b.size.height) - oy,
			depth:
				Math.max(a.origin.z + a.size.depth, b.origin.z + b.size.depth) - oz,
		},
	};
}

export function box3Volume(b: Box3): number {
	return size3Volume(b.size);
}
