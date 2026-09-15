import { dotPrecise } from "@ac-kit/math-scalar";

/**
 * Linkage criterion for computing inter-cluster distances.
 *
 * - `"single"` — minimum pairwise distance. Prone to chaining.
 * - `"average"` — mean pairwise distance (UPGMA). Balanced; default.
 * - `"complete"` — maximum pairwise distance. Compact clusters; eliminates
 *   chaining.
 * - `"ward"` — minimises the increase in total within-cluster variance (Ward's
 *   minimum-variance criterion). The threshold is in Ward-distance units
 *   (√ΔTWCSS), which differ from the raw distance units of `getDistance`.
 */
export type HierarchicalLinkage = "single" | "average" | "complete" | "ward";

export type HierarchicalClusterOptions = {
	linkage?: HierarchicalLinkage;
};

/**
 * Agglomerative hierarchical clustering with selectable linkage.
 *
 * Pre-computes a full n×n pairwise distance matrix and uses the Lance–Williams
 * recurrence to update inter-cluster distances after each merge — O(n) per
 * merge instead of recomputing from raw point pairs.
 *
 * Complexity: O(n²) space; O(n³) time in the worst case (n−1 merges × O(n²)
 * scan). Acceptable for n up to a few hundred (e.g. palette entries across a
 * gallery).
 *
 * @param n Number of items (indexed 0 … n-1).
 * @param getDistance Pairwise distance between original items by index.
 * @param threshold Merge threshold: cluster pairs whose inter-cluster distance
 *   is ≥ this value are not merged.
 * @param options Optional linkage selection. Default: `"average"`.
 * @returns Array of clusters; each cluster is an array of original indices.
 */
export function hierarchicalCluster(
	n: number,
	getDistance: (i: number, j: number) => number,
	threshold: number,
	options?: HierarchicalClusterOptions,
): number[][] {
	if (n === 0) return [];

	const linkage = options?.linkage ?? "average";

	// Build a symmetric n×n distance matrix.
	// clusterDist[i][j] holds the current inter-cluster distance (same value at [j][i]).
	const clusterDist: number[][] = Array.from({ length: n }, () =>
		Array.from<number>({ length: n }).fill(0),
	);
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const rawDist = getDistance(i, j);
			// Ward's singleton distance is rawDist / √2 (= √(½ · d²), the TWCSS increase for two singletons).
			const d = linkage === "ward" ? rawDist / Math.SQRT2 : rawDist;
			clusterDist[i]![j] = d;
			clusterDist[j]![i] = d;
		}
	}

	const sizes = Array.from<number>({ length: n }).fill(1);
	const members: number[][] = Array.from({ length: n }, (_, i) => [i]);
	const active = Array.from<boolean>({ length: n }).fill(true);

	for (let step = 0; step < n - 1; step++) {
		// Find the active pair with the smallest inter-cluster distance.
		let minDist = Infinity;
		let mergeA = -1;
		let mergeB = -1;

		for (let i = 0; i < n; i++) {
			if (!active[i]) continue;
			for (let j = i + 1; j < n; j++) {
				if (!active[j]) continue;
				const d = clusterDist[i]![j]!;
				if (d < minDist) {
					minDist = d;
					mergeA = i;
					mergeB = j;
				}
			}
		}

		if (mergeA === -1 || minDist >= threshold) break;

		const nA = sizes[mergeA]!;
		const nB = sizes[mergeB]!;
		const dAB = clusterDist[mergeA]![mergeB]!;

		// Update distances from the merged cluster (mergeA absorbs mergeB) to all remaining
		// active clusters using the Lance–Williams recurrence for the chosen linkage.
		for (let c = 0; c < n; c++) {
			if (!active[c] || c === mergeA || c === mergeB) continue;

			const nC = sizes[c]!;
			const dAC = clusterDist[mergeA]![c]!;
			const dBC = clusterDist[mergeB]![c]!;

			let newDist: number;
			if (linkage === "single") {
				newDist = Math.min(dAC, dBC);
			} else if (linkage === "complete") {
				newDist = Math.max(dAC, dBC);
			} else if (linkage === "average") {
				newDist = (nA * dAC + nB * dBC) / (nA + nB);
			} else {
				// Ward's recurrence: apply weights to squared Ward distances, then take sqrt.
				// The result is mathematically non-negative; max(0,…) guards against FP underflow.
				const nABC = nA + nB + nC;
				const wardSq =
					dotPrecise(
						[(nA + nC) * dAC, (nB + nC) * dBC, -(nC * dAB)],
						[dAC, dBC, dAB],
					) / nABC;
				newDist = Math.sqrt(Math.max(0, wardSq));
			}

			clusterDist[mergeA]![c] = newDist;
			clusterDist[c]![mergeA] = newDist;
		}

		sizes[mergeA] = nA + nB;
		members[mergeA] = [...members[mergeA]!, ...members[mergeB]!];
		active[mergeB] = false;
	}

	return members.filter((_, i) => active[i]);
}
