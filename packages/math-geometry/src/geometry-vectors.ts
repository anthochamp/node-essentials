import { Vec2, Vec3, Vec4 } from "@ac-kit/math-linear";

import { Point2 } from "./point2.js";
import { Point3 } from "./point3.js";
import { Point4 } from "./point4.js";

export function point2ToVec2(p: Point2): Vec2 {
	return [p.x, p.y];
}

export function vec2ToPoint2(v: Vec2): Point2 {
	return { x: v[0], y: v[1] };
}

export function point3ToVec3(p: Point3): Vec3 {
	return [p.x, p.y, p.z];
}

export function vec3ToPoint3(v: Vec3): Point3 {
	return { x: v[0], y: v[1], z: v[2] };
}

export function vec4ToPoint4(v: Vec4): Point4 {
	return { x: v[0], y: v[1], z: v[2], w: v[3] };
}

export function point4ToVec4(p: Point4): Vec4 {
	return [p.x, p.y, p.z, p.w];
}
