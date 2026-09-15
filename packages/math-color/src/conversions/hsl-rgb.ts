import { angleWrapDeg, vec2ToPolygonalPolar } from "@ac-kit/math-geometry";
import { RAD_TO_DEG } from "@ac-kit/math-scalar";

import { InSpace } from "../brand.js";
import { HslCoords } from "../models/hsl.js";
import { RgbCoords } from "../models/rgb.js";

const HSL_POLYGON_ = { sides: 6, rotation: 0 } as const;

export function hslToRgb<S extends string>(
	value: InSpace<HslCoords, S>,
): InSpace<RgbCoords, S> {
	const h01 = value.h / 360;

	if (value.s === 0) {
		return {
			r: value.l,
			g: value.l,
			b: value.l,
		} as InSpace<RgbCoords, S>;
	}

	const q =
		value.l < 0.5
			? value.l * (1 + value.s)
			: value.l + value.s - value.l * value.s;
	const p = 2 * value.l - q;

	return {
		r: hueToRgb_(p, q, h01 + 1 / 3),
		g: hueToRgb_(p, q, h01),
		b: hueToRgb_(p, q, h01 - 1 / 3),
	} as InSpace<RgbCoords, S>;
}

/**
 * Converts RGB to HSL values in the range [0, 1].
 *
 * @param value - The RGB color in the range [0, 1].
 * @returns The corresponding HSL color.
 */
export function rgbToHsl<S extends string>(
	value: InSpace<RgbCoords, S>,
): InSpace<HslCoords, S> {
	const max = Math.max(value.r, value.g, value.b);
	const min = Math.min(value.r, value.g, value.b);
	const l = (max + min) / 2;

	if (max === min) {
		return { h: 0, s: 0, l } as InSpace<HslCoords, S>;
	}

	// Project onto the HSL chroma plane (perpendicular to the grey axis).
	// The polygonal radius is the chroma (max − min); the angle is the hue.
	const cx = value.r - (value.g + value.b) / 2;
	const cy = (value.g - value.b) * (Math.sqrt(3) / 2);
	const { radius: chroma, angle } = vec2ToPolygonalPolar(
		[cx, cy],
		HSL_POLYGON_,
	);

	const s = chroma / (1 - Math.abs(2 * l - 1));
	const h = angleWrapDeg(angle * RAD_TO_DEG);

	return { h, s, l } as InSpace<HslCoords, S>;
}

/**
 * Calculates the RGB value from the hue, saturation, and lightness values.
 *
 * @param p - The first parameter for the hue calculation.
 * @param q - The second parameter for the hue calculation.
 * @param t - The hue value, normalized to the range [0, 1].
 * @returns The calculated RGB value in the range [0, 1].
 */
function hueToRgb_(p: number, q: number, t: number): number {
	if (t < 0) {
		t += 1;
	}
	if (t > 1) {
		t -= 1;
	}
	if (t < 1 / 6) {
		return p + (q - p) * 6 * t;
	}
	if (t < 1 / 2) {
		return q;
	}
	if (t < 2 / 3) {
		return p + (q - p) * (2 / 3 - t) * 6;
	}
	return p;
}
