import { PreciseSum } from "@ac-kit/core";
import type { KmeansOptions } from "@ac-kit/math-stats";
import { kmeans } from "@ac-kit/math-stats";

import { InSpace } from "../brand.js";
import { LabCoords, labDistance, labSquaredDistance } from "./lab.js";

export type LabCentroid<S extends string> = {
	/** The OKLab color of the centroid. */
	color: InSpace<LabCoords, S>;

	/** Fraction of total pixels in the image that this cluster represents. */
	weight: number;
};

/** Options for {@link labCentroids}. Alias of {@link KmeansOptions}. */
export type LabCentroidsOptions = KmeansOptions;

/**
 * Performs K-means clustering on the OKLab values of an image's pixels to
 * identify dominant colors.
 *
 * @param pixels - An array of OKLab pixel values to cluster.
 * @param k - The number of clusters (dominant colors) to identify.
 * @param options - Optional parameters for K-means clustering.
 * @returns An array of WeightedCentroid objects representing the dominant
 *   colors and their weights.
 */
export function labCentroids<S extends string>(
	pixels: InSpace<LabCoords, S>[],
	k: number,
	options?: LabCentroidsOptions,
): LabCentroid<S>[] {
	if (pixels.length === 0) return [];

	const clusters = kmeans<InSpace<LabCoords, S>>(
		pixels.length,
		Math.min(k, pixels.length),
		{
			pointValue: (i) => pixels[i]!,
			squaredDistance: (i, centroid) =>
				labSquaredDistance(pixels[i]!, centroid),
			centroidDistance: (a, b) => labDistance(a, b),
			computeCentroid: (indices) => {
				const sumL = new PreciseSum();
				const sumA = new PreciseSum();
				const sumB = new PreciseSum();
				for (const i of indices) {
					sumL.add(pixels[i]!.L);
					sumA.add(pixels[i]!.a);
					sumB.add(pixels[i]!.b);
				}
				const count = indices.length;
				return {
					L: sumL.value / count,
					a: sumA.value / count,
					b: sumB.value / count,
				} as InSpace<LabCoords, S>;
			},
			clone: (c) => ({ ...c }),
		},
		options,
	);

	return clusters
		.map((cluster) => ({
			color: cluster.centroid,
			weight: cluster.indices.length / pixels.length,
		}))
		.sort((a, b) => b.weight - a.weight);
}
