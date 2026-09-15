import type { Hash32 } from "./hash32.js";

export type CountMinSketchOptions<T> = {
	/** See {@link Hash32}: required, and why it cannot be defaulted. */
	hash: Hash32<T>;
	/**
	 * Tolerated over-estimate, as a fraction of the total count added. Defaults
	 * to `0.001`. Width is `ceil(e / epsilon)`, so halving this doubles memory.
	 */
	epsilon?: number;
	/**
	 * Probability that an estimate exceeds the `epsilon` bound. Defaults to
	 * `0.001`. Depth is `ceil(ln(1 / delta))`.
	 */
	delta?: number;
};

/**
 * Approximate frequency counting: how many times was this item seen?
 *
 * A `Map<T, number>` answers exactly and costs O(distinct); this answers with a
 * bounded over-estimate in `width × depth` counters, fixed regardless of how
 * many distinct items pass through. That is what makes it usable on a stream
 * whose alphabet does not fit in memory.
 *
 * **Estimates never under-count.** Every row's counter for an item includes
 * that item's true count plus whatever collided with it, so the minimum across
 * rows is an upper bound. With the default sizing, the over-estimate exceeds
 * `epsilon × total` with probability at most `delta`.
 *
 * There is no way to remove an item or to enumerate what was counted — the
 * items themselves are never stored.
 *
 * Time complexity: O(depth) for `add` and `estimate`, independent of the
 * stream's length. Space: `width × depth` 32-bit counters.
 *
 * @template T The item type.
 */
export class CountMinSketch<T> {
	private readonly counters: Uint32Array;
	private readonly hash: Hash32<T>;

	/** Counters per row. */
	readonly width: number;
	/** Rows, i.e. independent hashes. */
	readonly depth: number;

	/** The total of every count added, exact. */
	private total_ = 0;

	constructor(options: CountMinSketchOptions<T>) {
		const epsilon = options.epsilon ?? 0.001;
		const delta = options.delta ?? 0.001;

		if (!Number.isFinite(epsilon) || epsilon <= 0 || epsilon >= 1) {
			throw new RangeError(`Epsilon must be in (0, 1), got ${epsilon}`);
		}

		if (!Number.isFinite(delta) || delta <= 0 || delta >= 1) {
			throw new RangeError(`Delta must be in (0, 1), got ${delta}`);
		}

		this.hash = options.hash;
		this.width = Math.ceil(Math.E / epsilon);
		this.depth = Math.max(1, Math.ceil(Math.log(1 / delta)));
		this.counters = new Uint32Array(this.width * this.depth);
	}

	/** The sum of every count added. Exact, unlike a per-item estimate. */
	total(): number {
		return this.total_;
	}

	clear(): void {
		this.counters.fill(0);
		this.total_ = 0;
	}

	/**
	 * Records `times` occurrences of `item`. O(depth).
	 *
	 * @throws {RangeError} If `times` is negative or not an integer.
	 */
	add(item: T, times = 1): void {
		if (!Number.isInteger(times) || times < 0) {
			throw new RangeError(
				`Occurrence count must be a non-negative integer, got ${times}`,
			);
		}

		if (times === 0) {
			return;
		}

		const first = this.hash(item, 0) >>> 0;
		const second = this.hash(item, 1) >>> 0;

		for (let row = 0; row < this.depth; row++) {
			this.counters[this.slot(first, second, row)]! += times;
		}

		this.total_ += times;
	}

	/** O(m·depth) in the number of items. */
	addAll(items: Iterable<T>, times = 1): void {
		for (const item of items) {
			this.add(item, times);
		}
	}

	/**
	 * The estimated number of times `item` was added. O(depth).
	 *
	 * Never below the true count; above it by at most `epsilon × total()` with
	 * probability `1 - delta`.
	 */
	estimate(item: T): number {
		const first = this.hash(item, 0) >>> 0;
		const second = this.hash(item, 1) >>> 0;

		let smallest = Number.POSITIVE_INFINITY;

		for (let row = 0; row < this.depth; row++) {
			const counter = this.counters[this.slot(first, second, row)]!;

			if (counter < smallest) {
				smallest = counter;
			}
		}

		return smallest === Number.POSITIVE_INFINITY ? 0 : smallest;
	}

	/**
	 * Folds `other` in, so this sketch covers both streams.
	 *
	 * Merging is exact — counters add element-wise — which is what lets
	 * partitions be counted independently.
	 *
	 * @throws {RangeError} If the two were not sized identically.
	 */
	merge(other: CountMinSketch<T>): void {
		if (other.width !== this.width || other.depth !== this.depth) {
			throw new RangeError(
				"Cannot merge Count-Min sketches with different dimensions",
			);
		}

		for (let index = 0; index < this.counters.length; index++) {
			this.counters[index]! += other.counters[index]!;
		}

		this.total_ += other.total_;
	}

	private slot(first: number, second: number, row: number): number {
		// Kirsch-Mitzenmacher again: two hashes, `depth` independent-enough rows.
		const column = ((first + Math.imul(row, second)) >>> 0) % this.width;

		return row * this.width + column;
	}
}
