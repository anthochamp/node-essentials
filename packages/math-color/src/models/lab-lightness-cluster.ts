import { hierarchicalCluster } from "@ac-kit/math-stats";

import { LabCoords } from "./lab.js";

/**
 * Clusters an array of Lab colors by lightness using agglomerative hierarchical
 * clustering.
 *
 * Only the L component is used for grouping — hue and chroma are ignored.
 * Intended for achromatic colors where hue is undefined.
 *
 * @param colors - Lab colors to cluster.
 * @param lightnessThreshold - Maximum lightness distance to merge two clusters.
 * @returns Array of groups; each group is an array of indices into `colors`.
 */
export function labLightnessCluster(
	colors: LabCoords[],
	lightnessThreshold: number,
): number[][] {
	return hierarchicalCluster(
		colors.length,
		(i, j) => Math.abs(colors[i]!.L - colors[j]!.L),
		lightnessThreshold,
	);
}
