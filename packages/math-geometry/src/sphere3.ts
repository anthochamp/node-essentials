import { Vec3, vec3Add, vec3DistanceToSq } from "@ac-kit/math-linear";
import { TWO_PI } from "@ac-kit/math-scalar";

export type Sphere3 = {
	center: Vec3;
	radius: number;
};

export function sphere3ContainsPoint(s: Sphere3, p: Vec3): boolean {
	return vec3DistanceToSq(s.center, p) <= s.radius * s.radius;
}

/** Exact equality of centre and radius. */
export function sphere3Equals(a: Sphere3, b: Sphere3): boolean {
	return (
		a.center[0] === b.center[0] &&
		a.center[1] === b.center[1] &&
		a.center[2] === b.center[2] &&
		a.radius === b.radius
	);
}

export function sphere3Intersects(a: Sphere3, b: Sphere3): boolean {
	const radSum = a.radius + b.radius;
	return vec3DistanceToSq(a.center, b.center) <= radSum * radSum;
}

export function sphere3SurfaceArea(s: Sphere3): number {
	return 2 * TWO_PI * s.radius * s.radius;
}

export function sphere3Translate(s: Sphere3, v: Vec3): Sphere3 {
	return { center: vec3Add(s.center, v), radius: s.radius };
}

export function sphere3Volume(s: Sphere3): number {
	return (2 / 3) * TWO_PI * s.radius * s.radius * s.radius;
}
