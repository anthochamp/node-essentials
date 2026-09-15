import type { Callable } from "@ac-kit/core";

import { BinaryHeap } from "../heap/binary-heap.js";
import type { ISimilarityIndex } from "./isimilarity-index.js";

/**
 * A metric: the distance between two items.
 *
 * Must satisfy the metric axioms — non-negative, zero only for identical items,
 * symmetric, and obeying the triangle inequality. The triangle inequality is
 * not a formality here: it is the only reason a branch can be pruned, so a
 * distance that violates it makes results silently wrong rather than slow.
 */
export type Metric<T> = Callable<[a: T, b: T], number>;

export type VpTreeOptions<T> = {
	/** Required: the tree has no notion of similarity without it. */
	distance: Metric<T>;
};

type VpNode<T> = {
	readonly vantagePoint: T;
	/** Median distance from the vantage point; splits inner from outer. */
	readonly threshold: number;
	inner: VpNode<T> | null;
	outer: VpNode<T> | null;
};

/** An item paired with its distance from the query. */
type Candidate<T> = readonly [item: T, distance: number];

/**
 * A vantage-point tree: nearest-neighbour search over an arbitrary metric
 * space.
 *
 * Unlike a k-d tree it needs no coordinates — only a distance function — so it
 * indexes edit distance over strings, cosine distance over embeddings, or any
 * other metric, at any dimensionality. That generality is why this is the only
 * generic spatial structure in the repository; `@ac-kit/math-geometry`'s
 * `KdTree2`/`KdTree3` stay fixed-dimension and Euclidean.
 *
 * Each node splits its items by their distance from a chosen vantage point,
 * inside or outside the median radius. A query then prunes whichever half the
 * triangle inequality proves cannot hold anything closer than what is already
 * found.
 *
 * Time complexity: O(n log n) to build. Queries are O(log n) for well-behaved
 * metrics and degrade toward O(n) as the intrinsic dimensionality rises — the
 * curse of dimensionality is real here, and on high-dimensional data a linear
 * scan can win.
 *
 * **Adding is deferred.** A VP tree is built from a known point set; inserting
 * incrementally would unbalance it. `add` buffers, and the next query rebuilds
 * the whole tree in O(n log n). Add in batches, then query.
 *
 * @template T The item type.
 */
export class VpTree<T> implements ISimilarityIndex<T> {
	private readonly items: T[] = [];
	private readonly distance: Metric<T>;

	private root: VpNode<T> | null = null;
	private stale = false;

	constructor(iterable: Iterable<T> | undefined, options: VpTreeOptions<T>) {
		this.distance = options.distance;

		if (iterable) {
			this.addAll(iterable);
		}
	}

	count(): number {
		return this.items.length;
	}

	clear(): void {
		this.items.length = 0;
		this.root = null;
		this.stale = false;
	}

	/** O(1); the tree is rebuilt on the next query. */
	add(item: T): void {
		this.items.push(item);
		this.stale = true;
	}

	/** O(m); the tree is rebuilt once, on the next query. */
	addAll(items: Iterable<T>): void {
		for (const item of items) {
			this.items.push(item);
		}

		this.stale = true;
	}

	/**
	 * The `count` items closest to `query`, nearest first.
	 *
	 * Fewer than `count` are yielded when the tree holds fewer. Ties are broken
	 * arbitrarily but deterministically for a given tree.
	 */
	*nearest(query: T, count: number): IterableIterator<Candidate<T>> {
		if (count <= 0 || this.items.length === 0) {
			return;
		}

		this.rebuildIfStale();

		// A max-heap capped at `count`: its root is the worst kept candidate, so
		// it is both what gets evicted and the radius that prunes the search.
		const worstFirst = new BinaryHeap<Candidate<T>>(
			(left, right) => left[1] > right[1],
		);

		this.searchNearest(this.root, query, count, worstFirst);

		const found: Candidate<T>[] = [];
		for (;;) {
			const candidate = worstFirst.extract();

			if (candidate === undefined) {
				break;
			}

			found.push(candidate);
		}

		// Extracted worst-first, so reverse for nearest-first.
		yield* found.reverse();
	}

	/** Every item within `maxDistance` of `query`, in no particular order. */
	*within(query: T, maxDistance: number): IterableIterator<Candidate<T>> {
		if (maxDistance < 0 || this.items.length === 0) {
			return;
		}

		this.rebuildIfStale();

		yield* this.searchWithin(this.root, query, maxDistance);
	}

	private rebuildIfStale(): void {
		if (!this.stale) {
			return;
		}

		this.root = this.build(this.items.slice());
		this.stale = false;
	}

	private build(items: T[]): VpNode<T> | null {
		if (items.length === 0) {
			return null;
		}

		// The last item as vantage point: any choice is valid, and picking a fixed
		// position keeps construction deterministic and allocation-free.
		const vantagePoint = items.pop() as T;

		if (items.length === 0) {
			return { vantagePoint, threshold: 0, inner: null, outer: null };
		}

		const distances = items.map(
			(item) => [item, this.distance(item, vantagePoint)] as const,
		);

		distances.sort((left, right) => left[1] - right[1]);

		const middle = distances.length >>> 1;
		const threshold = distances[middle]![1];

		return {
			vantagePoint,
			threshold,
			inner: this.build(distances.slice(0, middle).map(([item]) => item)),
			outer: this.build(distances.slice(middle).map(([item]) => item)),
		};
	}

	private searchNearest(
		node: VpNode<T> | null,
		query: T,
		count: number,
		worstFirst: BinaryHeap<Candidate<T>>,
	): void {
		if (node === null) {
			return;
		}

		const distance = this.distance(query, node.vantagePoint);

		if (worstFirst.count() < count) {
			worstFirst.insert([node.vantagePoint, distance]);
		} else if (distance < (worstFirst.peek() as Candidate<T>)[1]) {
			worstFirst.insertAndExtract([node.vantagePoint, distance]);
		}

		// The radius currently guaranteed: infinite until `count` are held, since
		// nothing can be ruled out before then.
		const radius =
			worstFirst.count() < count
				? Number.POSITIVE_INFINITY
				: (worstFirst.peek() as Candidate<T>)[1];

		// Descend the likelier side first, so the radius tightens before the other
		// side is considered at all.
		if (distance < node.threshold) {
			if (distance - radius <= node.threshold) {
				this.searchNearest(node.inner, query, count, worstFirst);
			}
			if (distance + radius >= node.threshold) {
				this.searchNearest(node.outer, query, count, worstFirst);
			}
		} else {
			if (distance + radius >= node.threshold) {
				this.searchNearest(node.outer, query, count, worstFirst);
			}
			if (distance - radius <= node.threshold) {
				this.searchNearest(node.inner, query, count, worstFirst);
			}
		}
	}

	private *searchWithin(
		node: VpNode<T> | null,
		query: T,
		maxDistance: number,
	): IterableIterator<Candidate<T>> {
		if (node === null) {
			return;
		}

		const distance = this.distance(query, node.vantagePoint);

		if (distance <= maxDistance) {
			yield [node.vantagePoint, distance];
		}

		if (distance - maxDistance <= node.threshold) {
			yield* this.searchWithin(node.inner, query, maxDistance);
		}

		if (distance + maxDistance >= node.threshold) {
			yield* this.searchWithin(node.outer, query, maxDistance);
		}
	}
}
