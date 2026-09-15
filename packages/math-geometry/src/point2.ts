import {
	clamp,
	compareNaturalAscending,
	isCloseAbsolute,
	round,
	type ComparatorResult,
	type RoundOptions,
} from "@ac-kit/core";
import { DistanceType, Vec2 } from "@ac-kit/math-linear";

import { geometryConfig } from "./globals.js";

export type Point2<T extends bigint | number | string | null = number> = {
	x: T;
	y: T;
};

export function point2Clamp(p: Point2, min: Point2, max: Point2): Point2 {
	return {
		x: clamp(p.x, min.x, max.x),
		y: clamp(p.y, min.y, max.y),
	};
}

export function point2DisplacementTo(pA: Point2, pB: Point2): Vec2 {
	return [pB.x - pA.x, pB.y - pA.y];
}

export function point2Distance(
	pA: Point2,
	pB: Point2,
	type: DistanceType = "euclidean",
): number {
	const dx = Math.abs(pB.x - pA.x);
	const dy = Math.abs(pB.y - pA.y);
	switch (type) {
		case "manhattan":
			return dx + dy;
		case "chebyshev":
			return Math.max(dx, dy);
		case "euclidean":
			return Math.sqrt(dx * dx + dy * dy);
	}
}

/**
 * Exact coordinate equality.
 *
 * Transitive, and therefore the one to use as a set or map key, or to dedupe
 * with. `compare(a, b) === 0` under {@link point2CompareLexicographic} agrees
 * with it exactly. See {@link point2IsClose} for a tolerant test.
 */
export function point2Equals(pA: Point2, pB: Point2): boolean {
	return pA.x === pB.x && pA.y === pB.y;
}

/**
 * Whether both coordinates are within `tolerance` of each other, in the
 * caller's own units.
 *
 * Not transitive, so it is not an equality in the sense a `Set` or `Map` needs,
 * and never a basis for ordering — use {@link point2Equals} there.
 */
export function point2IsClose(
	pA: Point2,
	pB: Point2,
	tolerance: number = geometryConfig.defaultLinearTolerance,
): boolean {
	return (
		isCloseAbsolute(pA.x, pB.x, tolerance) &&
		isCloseAbsolute(pA.y, pB.y, tolerance)
	);
}

/**
 * Arbitrary but deterministic total order on points, by `x` then `y`.
 *
 * Not a geometric ordering — no such thing exists in the plane. It is the
 * canonical order that sweep-line and hull algorithms sort by, and the way to
 * put points in an ordered container. Exact, so it agrees with
 * {@link point2Equals}.
 */
export function point2CompareLexicographic(
	pA: Point2,
	pB: Point2,
): ComparatorResult {
	return (
		compareNaturalAscending(pA.x, pB.x) || compareNaturalAscending(pA.y, pB.y)
	);
}

export function point2Lerp(pA: Point2, pB: Point2, t: number): Point2 {
	return {
		x: pA.x + (pB.x - pA.x) * t,
		y: pA.y + (pB.y - pA.y) * t,
	};
}

export function point2Max(pA: Point2, pB: Point2): Point2 {
	return {
		x: Math.max(pA.x, pB.x),
		y: Math.max(pA.y, pB.y),
	};
}

export function point2Midpoint(pA: Point2, pB: Point2): Point2 {
	return {
		x: (pA.x + pB.x) / 2,
		y: (pA.y + pB.y) / 2,
	};
}

export function point2Min(pA: Point2, pB: Point2): Point2 {
	return {
		x: Math.min(pA.x, pB.x),
		y: Math.min(pA.y, pB.y),
	};
}

export function point2Round(p: Point2, options?: RoundOptions): Point2 {
	return {
		x: round(p.x, options),
		y: round(p.y, options),
	};
}

export function point2Translate(p: Point2, v: Vec2): Point2 {
	return {
		x: p.x + v[0],
		y: p.y + v[1],
	};
}
