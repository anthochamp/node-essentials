import { round } from "@ac-kit/core";
import { lerp } from "@ac-kit/math-scalar";

import { WithAlpha } from "../brand.js";
import { Rgb8, Rgba8 } from "../encoding/rgb8/rgb8.js";
import { RgbCoords } from "../models/rgb.js";

/**
 * Converts RGB values from the range [0, 1] to [0, 255].
 *
 * Rounds to nearest rather than truncating, which would bias every channel down
 * and make `rgb8ToRgb1` → `rgb1ToRgb8` lose a step on almost every colour.
 *
 * @param value - The RGB color in the range [0, 1].
 * @returns The corresponding RGB color in the range [0, 255].
 */
export function rgb1ToRgb8(value: RgbCoords): Rgb8 {
	return {
		r8: round(lerp(0, 255, value.r)),
		g8: round(lerp(0, 255, value.g)),
		b8: round(lerp(0, 255, value.b)),
	};
}

/**
 * Converts RGB values from the range [0, 255] to [0, 1].
 *
 * @param value - The RGB color in the range [0, 255].
 * @returns The corresponding RGB color in the range [0, 1].
 */
export function rgb8ToRgb1(value: Rgb8): RgbCoords {
	return {
		r: value.r8 / 255,
		g: value.g8 / 255,
		b: value.b8 / 255,
	};
}

export function rgba1ToRgba8(value: RgbCoords | WithAlpha<RgbCoords>): Rgba8 {
	const rgb8 = rgb1ToRgb8(value);
	if ("alpha" in value && value.alpha !== undefined) {
		return {
			...rgb8,
			a8: round(lerp(0, 255, value.alpha), { roundingMethod: "floor" }),
		};
	} else {
		return { ...rgb8, a8: 255 };
	}
}

export function rgba8ToRgba1(value: Rgb8 | Rgba8): WithAlpha<RgbCoords> {
	const rgb1 = rgb8ToRgb1(value);
	if ("a8" in value) {
		return {
			...rgb1,
			alpha: value.a8 / 255,
		};
	} else {
		return { ...rgb1 };
	}
}
