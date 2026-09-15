import { isCloseAbsolute } from "@ac-kit/core";
import { lerp } from "@ac-kit/math-scalar";

import { geometryConfig } from "./globals.js";

export type Size2<T extends bigint | number | string | null = number> = {
	width: T;
	height: T;
};

export function size2Area(size: Size2): number {
	return size.width * size.height;
}

export function size2AspectRatio(size: Size2): number {
	return size.width / size.height;
}

export function size2Clamp(size: Size2, min: Size2, max: Size2): Size2 {
	return {
		width: Math.max(min.width, Math.min(max.width, size.width)),
		height: Math.max(min.height, Math.min(max.height, size.height)),
	};
}

export function size2Contains(container: Size2, contained: Size2): boolean {
	return (
		container.width >= contained.width && container.height >= contained.height
	);
}

/** Exact equality. See {@link size2IsClose} for a tolerant test. */
export function size2Equals(a: Size2, b: Size2): boolean {
	return a.width === b.width && a.height === b.height;
}

/**
 * Whether both extents are within `tolerance` of each other, in the caller's
 * own units.
 *
 * Not transitive, so never a basis for ordering or for a set or map key — use
 * {@link size2Equals} there.
 */
export function size2IsClose(
	a: Size2,
	b: Size2,
	tolerance: number = geometryConfig.defaultLinearTolerance,
): boolean {
	return (
		isCloseAbsolute(a.width, b.width, tolerance) &&
		isCloseAbsolute(a.height, b.height, tolerance)
	);
}

/**
 * Whether both extents are within `tolerance` of zero.
 *
 * Tolerant rather than exact: an extent is normally the result of a
 * subtraction, so a degenerate one lands near zero rather than on it.
 */
export function size2IsZero(
	size: Size2,
	tolerance: number = geometryConfig.defaultLinearTolerance,
): boolean {
	return (
		isCloseAbsolute(size.width, 0, tolerance) &&
		isCloseAbsolute(size.height, 0, tolerance)
	);
}

export function size2Lerp(a: Size2, b: Size2, t: number): Size2 {
	return {
		width: lerp(a.width, b.width, t),
		height: lerp(a.height, b.height, t),
	};
}

export function size2Max(a: Size2, b: Size2): Size2 {
	return {
		width: Math.max(a.width, b.width),
		height: Math.max(a.height, b.height),
	};
}

export function size2Min(a: Size2, b: Size2): Size2 {
	return {
		width: Math.min(a.width, b.width),
		height: Math.min(a.height, b.height),
	};
}

export function size2Round(size: Size2): Size2 {
	return { width: Math.round(size.width), height: Math.round(size.height) };
}

export function size2Scale(size: Size2, scale: number): Size2 {
	return {
		width: size.width * scale,
		height: size.height * scale,
	};
}

export function size2ScaleToFill(container: Size2, contained: Size2): number {
	const scaleWidth = container.width / contained.width;
	const scaleHeight = container.height / contained.height;
	return Math.max(scaleWidth, scaleHeight);
}

export function size2ScaleToFit(container: Size2, contained: Size2): number {
	const scaleWidth = container.width / contained.width;
	const scaleHeight = container.height / contained.height;
	return Math.min(scaleWidth, scaleHeight);
}
