import {
	CountMinSketch,
	type CountMinSketchOptions,
} from "./count-min-sketch.js";
import type { Hash32 } from "./hash32.js";

export type TopKOptions<T> = Omit<CountMinSketchOptions<T>, "hash"> & {
	/** See {@link Hash32}: required, and why it cannot be defaulted. */
	hash: Hash32<T>;
	/** How many heavy hitters to track. */
	k: number;
};

/** A tracked item and the frequency estimated for it. */
export type HeavyHitter<T> = {
	readonly item: T;
	readonly count: number;
};

/**
 * Approximate heavy hitters: the `k` most frequent items in a stream.
 *
 * A {@link CountMinSketch} estimates every item's frequency in fixed space; on
 * its own it cannot say _which_ items are frequent, because it never stores
 * them. This pairs it with a bounded set of candidates — the `k` items with the
 * highest estimates seen so far — which is what turns "how often was X seen"
 * into "what is seen most".
 *
 * Both approximations compound: an item is reported with the sketch's
 * over-estimate, and a genuinely heavy item can be missed if it was evicted
 * from the candidate set early, before its count grew. Raising `k` above the
 * number actually wanted makes that far less likely.
 *
 * Time complexity: O(depth + k) per `add` — the sketch update plus a scan of
 * the candidates. `heavyHitters` is O(k log k) to sort.
 *
 * @template T The item type.
 */
export class TopK<T> {
	private readonly sketch: CountMinSketch<T>;
	/** Candidates by item, holding the estimate at the time of last update. */
	private readonly candidates = new Map<T, number>();

	/** How many heavy hitters are tracked. */
	readonly k: number;

	constructor(options: TopKOptions<T>) {
		if (!Number.isInteger(options.k) || options.k < 1) {
			throw new RangeError(`k must be a positive integer, got ${options.k}`);
		}

		this.k = options.k;
		this.sketch = new CountMinSketch<T>(options);
	}

	/** The total of every count added, exact. */
	total(): number {
		return this.sketch.total();
	}

	/** How many candidates are currently tracked, at most `k`. */
	count(): number {
		return this.candidates.size;
	}

	clear(): void {
		this.sketch.clear();
		this.candidates.clear();
	}

	/** O(depth + k). */
	add(item: T, times = 1): void {
		this.sketch.add(item, times);

		const estimate = this.sketch.estimate(item);

		if (this.candidates.has(item)) {
			this.candidates.set(item, estimate);
			return;
		}

		if (this.candidates.size < this.k) {
			this.candidates.set(item, estimate);
			return;
		}

		const weakest = this.weakestCandidate();

		// Only displace a candidate this item actually beats; ties keep the
		// incumbent, which has been heavy for longer.
		if (weakest !== undefined && estimate > weakest[1]) {
			this.candidates.delete(weakest[0]);
			this.candidates.set(item, estimate);
		}
	}

	/** O(m·(depth + k)) in the number of items. */
	addAll(items: Iterable<T>, times = 1): void {
		for (const item of items) {
			this.add(item, times);
		}
	}

	/** The sketch's estimate for `item`, tracked or not. O(depth). */
	estimate(item: T): number {
		return this.sketch.estimate(item);
	}

	/** Whether `item` is currently one of the tracked candidates. O(1). */
	isTracked(item: T): boolean {
		return this.candidates.has(item);
	}

	/**
	 * The tracked heavy hitters, most frequent first. O(k log k).
	 *
	 * Counts are re-read from the sketch, so they are current rather than
	 * whatever they were when the candidate was admitted.
	 */
	heavyHitters(): HeavyHitter<T>[] {
		const found: HeavyHitter<T>[] = [];

		for (const item of this.candidates.keys()) {
			found.push({ item, count: this.sketch.estimate(item) });
		}

		found.sort((left, right) => right.count - left.count);

		return found;
	}

	private weakestCandidate(): readonly [T, number] | undefined {
		let weakest: readonly [T, number] | undefined;

		for (const [item, count] of this.candidates) {
			if (weakest === undefined || count < weakest[1]) {
				weakest = [item, count];
			}
		}

		return weakest;
	}
}
