import { vec3WeightedMean } from "@ac-kit/math-linear";

import { InSpace } from "../brand.js";
import { LabCoords } from "./lab.js";

export type LabWeighted<S extends string> = {
	color: InSpace<LabCoords, S>;
	weight: number;
};

/**
 * Computes the coverage-weighted mean of an array of Lab colors.
 *
 * Each entry contributes its color proportionally to its weight. The result is
 * the weighted centroid of the input colors in Lab space.
 *
 * @param entries - Array of Lab colors with associated weights (e.g. coverage
 *   fractions).
 * @returns The weighted mean Lab color. Returns NaN components if the total
 *   weight is zero.
 */
export function labWeightedMean<S extends string>(
	entries: LabWeighted<S>[],
): InSpace<LabCoords, S> {
	const [L, a, b] = vec3WeightedMean(entries, (e) => [
		[e.color.L, e.color.a, e.color.b],
		e.weight,
	]);
	return { L, a, b } as InSpace<LabCoords, S>;
}
