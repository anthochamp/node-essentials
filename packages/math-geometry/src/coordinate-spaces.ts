import { Vec2 } from "@ac-kit/math-linear";

import { Point2 } from "./point2.js";
import { Rect2 } from "./rect2.js";
import { Size2 } from "./size2.js";

/**
 * Converts a point in pixel coordinates to normalized device coordinates (NDC).
 *
 * @param p The point in pixel coordinates.
 * @param viewport The size of the viewport in pixels.
 * @returns The point in NDC, where x and y are in the range [-1, 1].
 */
export function point2ToNdc(p: Point2, viewport: Size2): Vec2 {
	return [(p.x / viewport.width) * 2 - 1, 1 - (p.y / viewport.height) * 2];
}

/**
 * Converts a point in normalized device coordinates (NDC) to pixel coordinates.
 *
 * @param ndc The point in NDC, where x and y are in the range [-1, 1].
 * @param viewport The size of the viewport in pixels.
 * @returns The point in pixel coordinates.
 */
export function ndcToPoint2(ndc: Vec2, viewport: Size2): Point2 {
	return {
		x: ((ndc[0] + 1) / 2) * viewport.width,
		y: ((1 - ndc[1]) / 2) * viewport.height,
	};
}

/**
 * Converts a point in pixel coordinates to UV coordinates relative to a given
 * rectangle.
 *
 * @param p The point in pixel coordinates.
 * @param rect The rectangle defining the UV space.
 * @returns The point in UV coordinates, where x and y are in the range [0, 1].
 */
export function point2ToUv(p: Point2, rect: Rect2): Vec2 {
	return [
		(p.x - rect.origin.x) / rect.size.width,
		(p.y - rect.origin.y) / rect.size.height,
	];
}

/**
 * Converts UV coordinates to a point in pixel coordinates relative to a given
 * rectangle.
 *
 * @param uv The UV coordinates, where x and y are in the range [0, 1].
 * @param rect The rectangle defining the UV space.
 * @returns The point in pixel coordinates.
 */
export function uvToPoint2(uv: Vec2, rect: Rect2): Point2 {
	return {
		x: uv[0] * rect.size.width + rect.origin.x,
		y: uv[1] * rect.size.height + rect.origin.y,
	};
}
