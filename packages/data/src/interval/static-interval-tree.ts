import { compareNaturalAscending, type Comparator } from "@ac-kit/core";

import type { IIntervalIndex } from "./iinterval-index.js";

/** A half-open interval `[from, to)` carrying a value. */
export type Interval<P, V> = {
	readonly from: P;
	readonly to: P;
	readonly value: V;
};

export type StaticIntervalTreeOptions<P> = {
	/**
	 * Orders the endpoints. Must be exact and a strict weak ordering. Defaults to
	 * ascending natural order via `<`.
	 */
	comparator?: Comparator<P>;
};

type CenteredNode_<P, V> = {
	readonly center: P;
	/** Intervals containing `center`, ascending by `from`. */
	readonly byStart: Interval<P, V>[];
	/** The same intervals, descending by `to`. */
	readonly byEnd: Interval<P, V>[];
	readonly left: CenteredNode_<P, V> | null;
	readonly right: CenteredNode_<P, V> | null;
};

/**
 * A centered interval tree: which intervals contain a point, or overlap a
 * range.
 *
 * Intervals are half-open, `[from, to)`, so touching intervals do not count as
 * overlapping — the convention that makes adjacent ranges tile without
 * ambiguity.
 *
 * Each node picks a center point and holds every interval spanning it, kept in
 * two orders so a query can stop as soon as an interval is out of range rather
 * than scanning the whole node. Intervals entirely left or right of the center
 * recurse into subtrees.
 *
 * **Static**: the whole interval set is given at construction, which is what
 * allows the balanced centers. Building is O(n log n).
 *
 * Time complexity: O(log n + k) per query for k results.
 *
 * @template P The endpoint type.
 * @template V The value carried by an interval.
 */
export class StaticIntervalTree<P, V> implements IIntervalIndex<P, V> {
	private readonly root: CenteredNode_<P, V> | null;
	private readonly size: number;

	readonly comparator: Comparator<P>;

	constructor(
		intervals: Iterable<Interval<P, V>>,
		options?: StaticIntervalTreeOptions<P>,
	) {
		this.comparator = options?.comparator ?? compareNaturalAscending;

		const indexable: Interval<P, V>[] = [];

		for (const interval of intervals) {
			const order = this.comparator(interval.from, interval.to);

			if (order > 0) {
				throw new RangeError("Interval 'from' must not be greater than 'to'");
			}

			// `[x, x)` is half-open and so contains no point at all: it can neither
			// be stabbed nor overlap anything. Keeping it would make every query
			// re-derive that per candidate.
			if (order < 0) {
				indexable.push(interval);
			}
		}

		this.size = indexable.length;
		this.root = this.build(indexable);
	}

	/**
	 * The number of intervals indexed.
	 *
	 * Empty (`from === to`) intervals are discarded at construction, so this can
	 * be lower than the number handed in.
	 */
	count(): number {
		return this.size;
	}

	/**
	 * The values of every interval containing `point`, i.e. where `from <= point
	 * < to`.
	 */
	*stab(point: P): IterableIterator<V> {
		yield* this.stabNode(this.root, point);
	}

	/**
	 * The values of every interval overlapping `[from, to)`.
	 *
	 * An empty or inverted query range yields nothing: no interval overlaps a
	 * range of zero width.
	 */
	*overlapping(from: P, to: P): IterableIterator<V> {
		if (this.comparator(from, to) >= 0) {
			return;
		}

		yield* this.overlappingNode(this.root, from, to);
	}

	private build(intervals: Interval<P, V>[]): CenteredNode_<P, V> | null {
		if (intervals.length === 0) {
			return null;
		}

		// The median of all endpoints: a center that splits the set evenly is what
		// keeps the tree shallow.
		const endpoints: P[] = [];
		for (const interval of intervals) {
			endpoints.push(interval.from, interval.to);
		}
		endpoints.sort(this.comparator);

		const center = endpoints[endpoints.length >>> 1] as P;

		const spanning: Interval<P, V>[] = [];
		const left: Interval<P, V>[] = [];
		const right: Interval<P, V>[] = [];

		for (const interval of intervals) {
			if (this.comparator(interval.to, center) <= 0) {
				left.push(interval);
			} else if (this.comparator(interval.from, center) > 0) {
				right.push(interval);
			} else {
				spanning.push(interval);
			}
		}

		// A center that isolates nothing would recurse forever; keep everything
		// here instead.
		if (spanning.length === 0) {
			return {
				center,
				byStart: intervals.toSorted((a, b) => this.comparator(a.from, b.from)),
				byEnd: intervals.toSorted((a, b) => this.comparator(b.to, a.to)),
				left: null,
				right: null,
			};
		}

		return {
			center,
			byStart: spanning.toSorted((a, b) => this.comparator(a.from, b.from)),
			byEnd: spanning.toSorted((a, b) => this.comparator(b.to, a.to)),
			left: this.build(left),
			right: this.build(right),
		};
	}

	private *stabNode(
		node: CenteredNode_<P, V> | null,
		point: P,
	): IterableIterator<V> {
		if (node === null) {
			return;
		}

		const order = this.comparator(point, node.center);

		if (order < 0) {
			// Ascending by start: the first interval starting after `point` ends the
			// run, and so does everything after it.
			for (const interval of node.byStart) {
				if (this.comparator(interval.from, point) > 0) {
					break;
				}
				if (this.comparator(point, interval.to) < 0) {
					yield interval.value;
				}
			}

			yield* this.stabNode(node.left, point);
			return;
		}

		// Descending by end: the first interval ending at or before `point` ends
		// the run.
		for (const interval of node.byEnd) {
			if (this.comparator(interval.to, point) <= 0) {
				break;
			}
			if (this.comparator(interval.from, point) <= 0) {
				yield interval.value;
			}
		}

		yield* this.stabNode(node.right, point);
	}

	private *overlappingNode(
		node: CenteredNode_<P, V> | null,
		from: P,
		to: P,
	): IterableIterator<V> {
		if (node === null) {
			return;
		}

		for (const interval of node.byStart) {
			// Ascending by start: once one starts at or after `to`, so does the rest.
			if (this.comparator(interval.from, to) >= 0) {
				break;
			}
			if (this.comparator(from, interval.to) < 0) {
				yield interval.value;
			}
		}

		if (this.comparator(from, node.center) < 0) {
			yield* this.overlappingNode(node.left, from, to);
		}

		if (this.comparator(node.center, to) < 0) {
			yield* this.overlappingNode(node.right, from, to);
		}
	}
}
