import { DistanceType } from "@ac-kit/math-linear";
import { lerp } from "@ac-kit/math-scalar";

export type Point4 = {
	x: number;
	y: number;
	z: number;
	w: number;
};

export function point4Distance(
	pA: Point4,
	pB: Point4,
	type: DistanceType = "euclidean",
): number {
	const dx = Math.abs(pB.x - pA.x);
	const dy = Math.abs(pB.y - pA.y);
	const dz = Math.abs(pB.z - pA.z);
	const dw = Math.abs(pB.w - pA.w);
	switch (type) {
		case "manhattan":
			return dx + dy + dz + dw;
		case "chebyshev":
			return Math.max(dx, dy, dz, dw);
		case "euclidean":
			return Math.hypot(dx, dy, dz, dw);
	}
}

/** Exact coordinate equality. */
export function point4Equals(pA: Point4, pB: Point4): boolean {
	return pA.x === pB.x && pA.y === pB.y && pA.z === pB.z && pA.w === pB.w;
}

export function point4Lerp(pA: Point4, pB: Point4, t: number): Point4 {
	return {
		x: lerp(pA.x, pB.x, t),
		y: lerp(pA.y, pB.y, t),
		z: lerp(pA.z, pB.z, t),
		w: lerp(pA.w, pB.w, t),
	};
}
