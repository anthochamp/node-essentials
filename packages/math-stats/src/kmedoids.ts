import { kmeans, KmeansCluster, KmeansOps, KmeansOptions } from "./kmeans.js";

/**
 * Input operations for k-medoids: all of {@link KmeansOps} except
 * `computeCentroid`.
 */
export type KmedoidsOps<T> = Omit<KmeansOps<T>, "computeCentroid">;

/**
 * K-medoids clustering.
 *
 * Like k-means, but the cluster representative is always an actual data point
 * (the medoid): the point that minimises the sum of `centroidDistance` to all
 * other cluster members. This guarantees the representative is a real observed
 * value, not a computed average — useful when the mean is not meaningful (e.g.
 * discrete labels, non-Euclidean spaces).
 *
 * Uses the same k-means++ seeding and assignment loop as {@link kmeans}.
 *
 * @param n Number of data points (indexed 0 … n-1).
 * @param k Desired number of clusters; clamped to `min(k, n)`.
 * @param ops Problem-specific operations. `computeCentroid` is handled
 *   internally.
 * @param options Optional algorithm tuning.
 * @returns One entry per non-empty cluster, with its medoid and assigned
 *   indices.
 */
export function kmedoids<T>(
	n: number,
	k: number,
	ops: KmedoidsOps<T>,
	options?: KmeansOptions,
): KmeansCluster<T>[] {
	return kmeans(n, k, { ...ops, computeCentroid: medoidFn_(ops) }, options);
}

/**
 * Returns a `computeCentroid` function that selects the medoid: the point in
 * the cluster with the smallest total `centroidDistance` to all other members.
 */
function medoidFn_<T>(ops: KmedoidsOps<T>): (pointIndices: number[]) => T {
	return (indices) => {
		let minTotal = Infinity;
		let bestIdx = indices[0]!;

		for (const i of indices) {
			const vi = ops.pointValue(i);
			let total = 0;
			for (const j of indices) {
				if (j !== i) total += ops.centroidDistance(vi, ops.pointValue(j));
			}
			if (total < minTotal) {
				minTotal = total;
				bestIdx = i;
			}
		}

		return ops.clone(ops.pointValue(bestIdx));
	};
}
