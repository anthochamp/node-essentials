import { clamp } from "@ac-kit/core";

import { LabD50 } from "../color-spaces.js";

/**
 * Clamps the channels of a {@link LabD50} colour to their standard encoding
 * ranges:
 *
 * - L* to [0, 100]
 * - A* to [-128, 127]
 * - B* to [-128, 127]
 *
 * These bounds match the integer encoding used in ICC profiles and sRGB-gamut
 * Lab round-trips. Highly chromatic or out-of-gamut colours may legitimately
 * exceed these ranges in intermediate computations; clamp only at output
 * boundaries.
 *
 * @param value - The Lab colour to clamp.
 * @returns A new Lab colour with channels within their standard ranges.
 */
export function labClamp(value: LabD50): LabD50 {
	return {
		L: clamp(value.L, 0, 100),
		a: clamp(value.a, -128, 127),
		b: clamp(value.b, -128, 127),
	} as LabD50;
}
