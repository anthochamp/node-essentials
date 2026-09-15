import { clamp } from "@ac-kit/core";

import { labMix } from "./models/lab.js";
import { Oklab } from "./spaces/color-spaces.js";

/**
 * A continuous colour scheme: a position in `[0, 1]` to a colour.
 *
 * The shape every named scheme takes, so a consumer can hold one without
 * knowing which. Positions outside the range are clamped rather than
 * extrapolated — a ramp has no meaning past its ends.
 */
export type ColorRamp = (t: number) => Oklab;

/**
 * Builds a ramp interpolating between control points, evenly spaced.
 *
 * Interpolation is in OKLab, which is why the stops are: mixing sRGB darkens
 * through the middle of a hue transition, and mixing in a cylindrical space
 * needs a hue policy this deliberately does not have.
 *
 * O(1) per sample — the segment is found by arithmetic, not by scanning.
 *
 * @param stops At least two, in ramp order.
 * @throws {RangeError} When fewer than two stops are given.
 */
export function createColorRamp(stops: readonly Oklab[]): ColorRamp {
	if (stops.length < 2) {
		throw new RangeError(
			`A ramp needs at least two stops, got ${stops.length}`,
		);
	}

	const lastIndex = stops.length - 1;
	return (t) => {
		const position = clamp(t, 0, 1) * lastIndex;
		const index = Math.min(Math.floor(position), lastIndex - 1);
		return labMix(stops[index]!, stops[index + 1]!, position - index);
	};
}

/**
 * `count` colours evenly spaced along a ramp, ends included.
 *
 * The discrete form, for a fixed number of categories or ranks. A single sample
 * takes the midpoint rather than an end, since neither end is more
 * representative than the other.
 *
 * @throws {RangeError} When `count` is not a positive integer.
 */
export function sampleRamp(ramp: ColorRamp, count: number): Oklab[] {
	if (!Number.isInteger(count) || count < 1) {
		throw new RangeError(
			`A sample count must be a positive integer, got ${count}`,
		);
	}

	if (count === 1) {
		return [ramp(0.5)];
	}

	return Array.from({ length: count }, (__, index) =>
		ramp(index / (count - 1)),
	);
}
