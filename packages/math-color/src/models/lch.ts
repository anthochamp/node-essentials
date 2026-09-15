import { angleDistanceDeg } from "@ac-kit/math-geometry";

import { InSpace } from "../brand.js";

/**
 * LCH coordinate model — cylindrical representation of a Lab space.
 *
 * All LCH-family spaces (CIE L_C_h° and OKLch) share this geometric model: L =
 * lightness (z-axis of the cylinder) C = chroma (radius from the neutral axis)
 * h = hue angle, degrees [0, 360)
 */
export type LchCoords = {
	/** Lightness. */
	L: number;
	/** Chroma (radius from the neutral axis). */
	C: number;
	/** Hue angle, degrees [0, 360). */
	h: number;
};

/**
 * Hue-angle distance between two LCH-family colours in the same space. Range
 * [0, 180°]. Ignores lightness and chroma.
 *
 * Unreliable for achromatic inputs (C ≈ 0) — filter those out upstream.
 */
export function lchHueDistance<S extends string>(
	a: InSpace<LchCoords, S>,
	b: InSpace<LchCoords, S>,
): number {
	return angleDistanceDeg(a.h, b.h);
}
