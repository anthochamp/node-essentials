import { isCloseAbsolute } from "@ac-kit/core";
import {
	Vec3,
	vec3Cross,
	vec3Dot,
	vec3Length,
	vec3Normalize,
} from "@ac-kit/math-linear";

import { geometryConfig } from "./globals.js";
import { Point3 } from "./point3.js";

export type Line3 = {
	point: Point3;
	direction: Vec3;
};

/** Returns the closest point on the infinite line to `p`. */
export function line3ClosestPoint(line: Line3, p: Point3): Point3 {
	const d = vec3Normalize(line.direction);
	const v: Vec3 = [p.x - line.point.x, p.y - line.point.y, p.z - line.point.z];
	const t = vec3Dot(v, d);
	return {
		x: line.point.x + d[0] * t,
		y: line.point.y + d[1] * t,
		z: line.point.z + d[2] * t,
	};
}

/**
 * Whether `p` lies on `line`, within `tolerance` of it.
 *
 * Tolerant by necessity: a line has zero volume, so no constructed point ever
 * lands on one exactly. `tolerance` is a distance in the caller's own units.
 */
export function line3ContainsPoint(
	line: Line3,
	p: Point3,
	tolerance: number = geometryConfig.defaultLinearTolerance,
): boolean {
	return line3DistanceToPoint(line, p) <= tolerance;
}

export function line3DistanceToPoint(line: Line3, p: Point3): number {
	const d = vec3Normalize(line.direction);
	const v: Vec3 = [p.x - line.point.x, p.y - line.point.y, p.z - line.point.z];
	return vec3Length(vec3Cross(v, d));
}

/**
 * Whether `a` and `b` are the same infinite line, within tolerance.
 *
 * Tolerant rather than exact, for the same reason as `line2Equals`: the same
 * line can be built from any point on it and any scaling of its direction.
 * Opposite directions denote the same line.
 *
 * @param linearTolerance - Distance, in the caller's units, within which a
 *   point still counts as lying on the other line.
 * @param angularTolerance - Dimensionless residual on `|dot| - 1`, within which
 *   two unit directions still count as collinear.
 */
export function line3Equals(
	a: Line3,
	b: Line3,
	linearTolerance: number = geometryConfig.defaultLinearTolerance,
	angularTolerance: number = geometryConfig.defaultAngularTolerance,
): boolean {
	const dot = vec3Dot(vec3Normalize(a.direction), vec3Normalize(b.direction));

	return (
		isCloseAbsolute(Math.abs(dot), 1, angularTolerance) &&
		line3ContainsPoint(a, b.point, linearTolerance)
	);
}
