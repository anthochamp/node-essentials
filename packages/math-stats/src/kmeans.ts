import type { RandomFn } from "@ac-kit/core";

/**
 * Operations that define a k-means (or k-medoids) problem over an arbitrary
 * value type T.
 *
 * By swapping `computeCentroid`, the same generic engine covers: - Standard
 * k-means (arithmetic mean centroid in Euclidean space) - Circular k-means
 * (circular mean centroid for angular data such as hue) - K-medoids via
 * `kmedoids` (medoid update handled internally — do not pass `computeCentroid`
 * there)
 */
export type KmeansOps<T> = {
	/** Returns the value of data point at index i. Used for kmeans++ seeding. */
	readonly pointValue: (i: number) => T;
	/**
	 * Squared distance from data point i to centroid c. Used in the assignment
	 * step and kmeans++ seeding. The squared form avoids a `Math.sqrt` in the hot
	 * assignment loop while still producing the same nearest-centroid
	 * assignment.
	 */
	readonly squaredDistance: (pointIndex: number, centroid: T) => number;
	/**
	 * Optional importance weight for data point i. Used only in k-means++
	 * seeding: the sampling probability is proportional to `pointWeight(i) ×
	 * d²(i, nearestCentroid)`, so high-weight points attract seeds more strongly
	 * than low-weight points at equal distance. Does NOT affect cluster
	 * assignment — that remains nearest-centroid by distance. Default: uniform
	 * weight 1.
	 */
	readonly pointWeight?: (i: number) => number;
	/**
	 * Distance between two centroid values. Used for the convergence check and in
	 * k-medoids update.
	 */
	readonly centroidDistance: (a: T, b: T) => number;
	/**
	 * Computes a new centroid from the given set of assigned point indices. For
	 * k-means: arithmetic mean (or circular mean for angular data). Do not
	 * provide this when calling `kmedoids` — it is supplied internally.
	 */
	readonly computeCentroid: (pointIndices: number[]) => T;
	/**
	 * Returns an independent copy of a centroid value to detect movement across
	 * iterations.
	 */
	readonly clone: (centroid: T) => T;
};

export type KmeansOptions = {
	/**
	 * Maximum number of assignment–update iterations before stopping. Default
	 * 200.
	 */
	maxIterations?: number;
	/**
	 * Stop when the largest centroid movement in an iteration is below this
	 * value. Default 0.0001.
	 */
	convergenceThreshold?: number;
	/** Optional PRNG for deterministic seeding. Default: `Math.random`. */
	randFn?: RandomFn | null;
};

export type KmeansCluster<T> = {
	/** Final centroid (or medoid) of this cluster. */
	readonly centroid: T;
	/** Indices of the data points assigned to this cluster. */
	readonly indices: readonly number[];
};

const DEFAULT_OPTIONS_: Required<KmeansOptions> = {
	maxIterations: 200,
	convergenceThreshold: 0.0001,
	randFn: null,
};

/**
 * Generic k-means clustering.
 *
 * Partitions n data points into at most k clusters by iterating: 1. Assignment
 * — each point is assigned to its nearest centroid. 2. Update — each centroid
 * is recomputed from its assigned points via `ops.computeCentroid`.
 *
 * Initial centroids are chosen via k-means++ (D² weighting), which spreads
 * seeds across the data distribution and reduces the risk of degenerate local
 * minima.
 *
 * By supplying a circular-mean implementation of `computeCentroid`, this
 * function also serves as circular k-means for angular data (e.g. OKLch hue).
 *
 * @param n Number of data points (indexed 0 … n-1).
 * @param k Desired number of clusters; clamped to `min(k, n)`.
 * @param ops Problem-specific operations.
 * @param options Optional algorithm tuning.
 * @returns One entry per non-empty cluster, with its final centroid and
 *   assigned indices.
 */
export function kmeans<T>(
	n: number,
	k: number,
	ops: KmeansOps<T>,
	options?: KmeansOptions,
): KmeansCluster<T>[] {
	if (n === 0) return [];

	const opts: Required<KmeansOptions> = {
		maxIterations: options?.maxIterations ?? DEFAULT_OPTIONS_.maxIterations,
		convergenceThreshold:
			options?.convergenceThreshold ?? DEFAULT_OPTIONS_.convergenceThreshold,
		randFn: options?.randFn ?? DEFAULT_OPTIONS_.randFn,
	};
	const rand = opts.randFn ?? Math.random.bind(Math);
	const actualK = Math.min(k, n);

	const centroids = kmeansppInit_(n, actualK, ops, rand);

	for (let iter = 0; iter < opts.maxIterations; iter++) {
		const assignments: number[][] = Array.from({ length: actualK }, () => []);

		// Assignment step: each point goes to the nearest centroid.
		for (let i = 0; i < n; i++) {
			let minSq = Infinity;
			let nearest = 0;
			for (let c = 0; c < actualK; c++) {
				const sq = ops.squaredDistance(i, centroids[c]!);
				if (sq < minSq) {
					minSq = sq;
					nearest = c;
				}
			}
			assignments[nearest]!.push(i);
		}

		// Update step: recompute each centroid; track maximum movement for convergence.
		let maxMove = 0;
		for (let c = 0; c < actualK; c++) {
			const group = assignments[c]!;
			if (group.length === 0) continue; // keep centroid in place

			const prev = ops.clone(centroids[c]!);
			centroids[c] = ops.computeCentroid(group);
			const move = ops.centroidDistance(centroids[c]!, prev);
			if (move > maxMove) maxMove = move;
		}

		if (maxMove < opts.convergenceThreshold) break;
	}

	// Final assignment pass to get definitive cluster membership after convergence.
	const finalGroups: number[][] = Array.from({ length: actualK }, () => []);
	for (let i = 0; i < n; i++) {
		let minSq = Infinity;
		let nearest = 0;
		for (let c = 0; c < actualK; c++) {
			const sq = ops.squaredDistance(i, centroids[c]!);
			if (sq < minSq) {
				minSq = sq;
				nearest = c;
			}
		}
		finalGroups[nearest]!.push(i);
	}

	return finalGroups
		.map((indices, c) => ({ centroid: centroids[c]!, indices }))
		.filter((cluster) => cluster.indices.length > 0);
}

function kmeansppInit_<T>(
	n: number,
	k: number,
	ops: KmeansOps<T>,
	rand: RandomFn,
): T[] {
	const centroids: T[] = [ops.clone(ops.pointValue(Math.floor(rand() * n)))];

	while (centroids.length < k) {
		// D²-weighted sampling: probability of picking point i is proportional to its squared
		// distance to the nearest already-chosen centroid.
		let total = 0;
		const distances: number[] = [];
		for (let i = 0; i < n; i++) {
			let minSq = Infinity;
			for (const c of centroids) {
				const sq = ops.squaredDistance(i, c);
				if (sq < minSq) minSq = sq;
			}
			const weighted = minSq * (ops.pointWeight?.(i) ?? 1);
			distances.push(weighted);
			total += weighted;
		}

		if (total === 0) {
			// All remaining points coincide with existing centroids — pick any point.
			centroids.push(ops.clone(ops.pointValue(Math.floor(rand() * n))));
			continue;
		}

		let remaining = rand() * total;
		let pushed = false;
		for (let i = 0; i < n; i++) {
			remaining -= distances[i]!;
			if (remaining <= 0) {
				centroids.push(ops.clone(ops.pointValue(i)));
				pushed = true;
				break;
			}
		}
		if (!pushed) {
			// Floating-point residual: fall back to the last point.
			centroids.push(ops.clone(ops.pointValue(n - 1)));
		}
	}

	return centroids;
}
