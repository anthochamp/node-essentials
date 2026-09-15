import { hierarchicalCluster } from "@ac-kit/math-stats";

import { InSpace } from "../brand.js";
import { LchCoords, lchHueDistance } from "./lch.js";

/**
 * Clusters an array of chromatic Lab LCH colors by hue using agglomerative
 * hierarchical clustering.
 *
 * Only the hue angle (H in Lch) determines grouping — lightness and chroma are
 * ignored. Achromatic colors have undefined hue and must be excluded before
 * calling this function.
 *
 * @param colors - Chromatic Lab LCH colors to cluster.
 * @param hueThreshold - Maximum hue angle distance in degrees to merge two
 *   clusters.
 * @returns Array of groups; each group is an array of indices into `colors`.
 */
export function lchHueCluster(
	colors: LchCoords[],
	hueThreshold: number,
): number[][] {
	return hierarchicalCluster(
		colors.length,
		(i, j) =>
			lchHueDistance(
				colors[i]! as InSpace<LchCoords, "">,
				colors[j]! as InSpace<LchCoords, "">,
			),
		hueThreshold,
	);
}
