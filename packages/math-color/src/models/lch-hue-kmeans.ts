import { identity, PreciseSum } from "@ac-kit/core";
import { angleDistanceDeg } from "@ac-kit/math-geometry";
import { DEG_TO_RAD, RAD_TO_DEG } from "@ac-kit/math-scalar";
import type { KmeansCluster, KmeansOptions } from "@ac-kit/math-stats";
import { kmeans } from "@ac-kit/math-stats";

import { InSpace } from "../brand.js";
import { LchCoords } from "./lch.js";

export type HueEntry<S extends string> = {
	/**
	 * Lch color to cluster by hue.
	 *
	 * Lightness and chroma are ignored during assignment, but the full Lch value
	 * is preserved in the output cluster for reference.
	 */
	readonly color: InSpace<LchCoords, S>;

	/**
	 * Coverage weight of this entry, influencing both k-means++ seeding and
	 * centroid updates.
	 *
	 * Must be non-negative; zero-weight entries are ignored during clustering.
	 */
	readonly weight: number;
};

/**
 * Weighted circular k-means on Lch hue.
 *
 * Clusters entries by hue angle only — lightness and chroma are ignored during
 * assignment. Coverage weights influence both k-means++ seeding (proportional
 * to `weight × d²`) and the centroid update (weighted circular mean), so
 * dominant palette entries carry more influence than minor ones.
 *
 * Handles the 0°/360° wrap-around correctly: centroids are computed via
 * `atan2(Σ w·sin h, Σ w·cos h)` rather than arithmetic mean.
 *
 * Achromatic inputs (undefined hue) must be excluded before calling this
 * function.
 *
 * @param entries Lch colors with associated coverage weights.
 * @param k Desired number of hue clusters; clamped to `min(k, entries.length)`.
 * @param options Optional k-means algorithm options (iterations, convergence,
 *   PRNG seed).
 * @returns Clusters; each centroid is a weighted circular mean hue in degrees
 *   [0, 360).
 */
export function lchHueKmeans<S extends string>(
	entries: HueEntry<S>[],
	k: number,
	options?: KmeansOptions,
): KmeansCluster<number>[] {
	return kmeans<number>(
		entries.length,
		k,
		{
			pointValue: (i) => entries[i]!.color.h,
			pointWeight: (i) => entries[i]!.weight,
			squaredDistance: (i, centroidHue) => {
				const d = angleDistanceDeg(entries[i]!.color.h, centroidHue);
				return d * d;
			},
			centroidDistance: (a, b) => angleDistanceDeg(a, b),
			computeCentroid: (indices) => {
				const sinSum = new PreciseSum();
				const cosSum = new PreciseSum();
				for (const i of indices) {
					const hRad = entries[i]!.color.h * DEG_TO_RAD;
					const w = entries[i]!.weight;
					sinSum.add(w * Math.sin(hRad));
					cosSum.add(w * Math.cos(hRad));
				}
				const h = Math.atan2(sinSum.value, cosSum.value) * RAD_TO_DEG;
				return h < 0 ? h + 360 : h;
			},
			clone: identity, // numbers are primitive values — no allocation needed
		},
		options,
	);
}
