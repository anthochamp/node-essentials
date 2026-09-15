/**
 * HSL coordinate model — hue, saturation, and lightness.
 *
 * Geometrically a cylindrical re-projection of the RGB cube: h (hue) = angle on
 * the ab-plane, degrees [0, 360) s (saturation) = radius [0, 1] l (lightness) =
 * z-axis height [0, 1]
 */
export type HslCoords = {
	/** Hue angle, degrees [0, 360). */
	h: number;
	/** Saturation [0, 1]. */
	s: number;
	/** Lightness [0, 1]. */
	l: number;
};
