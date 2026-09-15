import { isCloseAbsolute } from "@ac-kit/core";

import { angleNormalizeRad } from "./angles.js";
import { geometryConfig } from "./globals.js";

export type EulerOrder = "XYZ" | "YXZ" | "ZXY" | "ZYX" | "YZX" | "XZY";

/**
 * Euler angles represent a rotation in 3D space using three angles (x, y, z)
 * and a specific order of rotations.
 *
 * Note: Euler angles suffer from gimbal lock, which can lead to a loss of one
 * degree of freedom in 3D space. For many applications, quaternions are
 * preferred for representing rotations.
 */
export type EulerAngles = {
	order: EulerOrder;

	x: number; // Rotation around the X-axis in radians
	y: number; // Rotation around the Y-axis in radians
	z: number; // Rotation around the Z-axis in radians
};

/**
 * Exact equality of the three angles and the rotation order.
 *
 * Compares the angles as given: two sets a full turn apart are not equal, and
 * neither are two orders that happen to describe the same rotation. Normalise
 * with {@link eulerAnglesNormalize} first if that is not what you want.
 */
export function eulerAnglesEqual(a: EulerAngles, b: EulerAngles): boolean {
	return a.x === b.x && a.y === b.y && a.z === b.z && a.order === b.order;
}

/**
 * Whether the three angles are within `tolerance` radians of each other and the
 * rotation orders match.
 *
 * Not transitive, so never a basis for ordering or for a set or map key — use
 * {@link eulerAnglesEqual} there.
 */
export function eulerAnglesIsClose(
	a: EulerAngles,
	b: EulerAngles,
	tolerance: number = geometryConfig.defaultAngularTolerance,
): boolean {
	return (
		isCloseAbsolute(a.x, b.x, tolerance) &&
		isCloseAbsolute(a.y, b.y, tolerance) &&
		isCloseAbsolute(a.z, b.z, tolerance) &&
		a.order === b.order
	);
}

export function eulerAnglesNormalize(a: EulerAngles): EulerAngles {
	return {
		x: angleNormalizeRad(a.x),
		y: angleNormalizeRad(a.y),
		z: angleNormalizeRad(a.z),
		order: a.order,
	};
}
