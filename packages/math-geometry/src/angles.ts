import { mod } from "@ac-kit/core";
import { TWO_PI } from "@ac-kit/math-scalar";

/**
 * Computes the shortest distance between two angles in degrees, taking into
 * account the circular nature of angles. The result is always in the range [0,
 * 180].
 */
export function angleDistanceDeg(angleA: number, angleB: number): number {
	const delta = Math.abs(angleA - angleB);
	return delta > 180 ? 360 - delta : delta;
}

/**
 * Computes the shortest distance between two angles in radians, taking into
 * account the circular nature of angles. The result is always in the range [0,
 * π].
 */
export function angleDistanceRad(angleA: number, angleB: number): number {
	const delta = Math.abs(angleA - angleB);
	return delta > Math.PI ? TWO_PI - delta : delta;
}

/** Normalizes an angle in degrees to the range [0, 360). */
export function angleWrapDeg(angle: number): number {
	return mod(angle, 360);
}

/** Normalizes an angle in radians to the range [0, 2π). */
export function angleWrapRad(angle: number): number {
	return mod(angle, TWO_PI);
}

/** Normalizes an angle in degrees to the range (-180, 180]. */
export function angleNormalizeDeg(angle: number): number {
	return angleWrapDeg(angle + 180) - 180;
}

/** Normalizes an angle in radians to the range (-π, π]. */
export function angleNormalizeRad(angle: number): number {
	return angleWrapRad(angle + Math.PI) - Math.PI;
}

/**
 * Linearly interpolates between two angles in degrees, taking the shortest path
 * around the circle.
 */
export function angleLerpDeg(
	angleA: number,
	angleB: number,
	t: number,
): number {
	const delta = angleNormalizeDeg(angleB - angleA);
	return angleNormalizeDeg(angleA + delta * t);
}

/**
 * Linearly interpolates between two angles in radians, taking the shortest path
 * around the circle.
 */
export function angleLerpRad(
	angleA: number,
	angleB: number,
	t: number,
): number {
	const delta = angleNormalizeRad(angleB - angleA);
	return angleNormalizeRad(angleA + delta * t);
}
