import {
	vec3DistanceTo,
	vec3DistanceToSq,
	vec3Lerp,
} from "@ac-kit/math-linear";

import type { InSpace } from "../brand.js";

/**
 * Lab coordinate model — Cartesian 3-D perceptual colour space.
 *
 * All Lab-family spaces (CIE L_a_b* and OKLab) share this geometric model: L =
 * lightness scalar a = green–red chromatic axis (signed) b = blue–yellow
 * chromatic axis (signed)
 */
export type LabCoords = {
	/** Lightness. */
	L: number;
	/** Green–red axis (signed). */
	a: number;
	/** Blue–yellow axis (signed). */
	b: number;
};

/**
 * Computes the chroma (C*) of a Lab-family colour — the Euclidean distance from
 * the neutral axis in the a–b plane. Equivalent for OKLab and CIE L_a_b*.
 */
export function labChroma(lab: LabCoords): number {
	return Math.sqrt(lab.a ** 2 + lab.b ** 2);
}

/**
 * Linearly interpolates between two Lab-family colours in the same space.
 * Identical geometry for OKLab and CIE L_a_b*.
 *
 * @param a - Start colour (t = 0).
 * @param b - End colour (t = 1).
 * @param t - Interpolation factor in [0, 1].
 */
export function labMix<S extends string>(
	a: InSpace<LabCoords, S>,
	b: InSpace<LabCoords, S>,
	t: number,
): InSpace<LabCoords, S> {
	const [rL, ra, rb] = vec3Lerp([a.L, a.a, a.b], [b.L, b.a, b.b], t);
	return { L: rL, a: ra, b: rb } as InSpace<LabCoords, S>;
}

/**
 * Euclidean distance between two Lab-family colours in the same space.
 *
 * For OKLab this approximates perceptual ΔE. For CIE L_a_b* prefer CIEDE2000.
 */
export function labDistance<S extends string>(
	a: InSpace<LabCoords, S>,
	b: InSpace<LabCoords, S>,
): number {
	return vec3DistanceTo([a.L, a.a, a.b], [b.L, b.a, b.b]);
}

/**
 * Squared Euclidean distance between two Lab-family colours in the same space.
 *
 * Avoids a square root — use when only relative ordering matters.
 */
export function labSquaredDistance<S extends string>(
	a: InSpace<LabCoords, S>,
	b: InSpace<LabCoords, S>,
): number {
	return vec3DistanceToSq([a.L, a.a, a.b], [b.L, b.a, b.b]);
}

/**
 * Named strictness levels for achromatic (grey) chroma thresholds.
 *
 * The absolute threshold values differ between OKLab and CIE L_a_b*: use
 * {@link isOklabAchromatic} and {@link isCieLabAchromatic} respectively.
 */
export type IsLabAchromaticStrictness =
	| "very-strict"
	| "strict"
	| "moderate"
	| "lenient"
	| "very-lenient";

/**
 * Tests whether a Lab chroma value is achromatic given a space-specific
 * threshold table.
 *
 * This is the shared implementation; callers should use the space-specific
 * wrappers {@link isOklabAchromatic} or {@link isCieLabAchromatic} which supply
 * the correct table.
 *
 * @param chroma - Chroma value (output of {@link labChroma}).
 * @param threshold - Named strictness level or an absolute chroma value.
 * @param thresholds - Space-specific named-strictness → absolute-value table.
 */
export function labIsAchromatic(
	chroma: number,
	threshold: IsLabAchromaticStrictness | number,
	thresholds: Record<IsLabAchromaticStrictness, number>,
): boolean {
	if (typeof threshold === "number") {
		return chroma < threshold;
	}
	return chroma < thresholds[threshold];
}
