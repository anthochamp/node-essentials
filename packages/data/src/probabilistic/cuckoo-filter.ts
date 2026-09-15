import type { Hash32 } from "./hash32.js";

export type CuckooFilterOptions<T> = {
	/** See {@link Hash32}: required, and why it cannot be defaulted. */
	hash: Hash32<T>;
	/** How many items the filter is sized for. */
	expectedItems: number;
	/**
	 * Fingerprints per bucket. Defaults to `4`, the value the literature finds
	 * best for load factors around 95%. Must be between 1 and 8.
	 */
	bucketSize?: number;
	/**
	 * How many evictions an insert attempts before declaring the filter full.
	 * Defaults to `500`.
	 */
	maxKicks?: number;
};

/** Zero marks an empty slot, so a fingerprint never is. */
const EMPTY = 0;

/**
 * Approximate set membership **with deletion**, the thing a Bloom filter cannot
 * do.
 *
 * Stores a short fingerprint of each item in one of two candidate buckets. The
 * second bucket is derived from the first by XOR with the fingerprint's hash,
 * which is what makes the relation symmetric: from either bucket the other can
 * be computed without the item, so a fingerprint can be relocated during
 * insertion and found again during lookup.
 *
 * Deleting removes one copy of a fingerprint. **Only delete items actually
 * inserted**: removing a fingerprint that a different item happens to share
 * would introduce a false negative, which this structure otherwise never has.
 *
 * `add` can fail. When both candidate buckets are full, it evicts and relocates
 * up to `maxKicks` times; past that the filter is too loaded and `add` returns
 * `false`. A failed insert is **rolled back**, so the filter still holds
 * exactly what it held before — no previously inserted item is ever displaced
 * into nothing.
 *
 * Time complexity: O(1) for `has` and `delete` — exactly two bucket probes.
 * `add` is O(1) amortised, degrading as the load factor approaches capacity.
 *
 * @template T The item type.
 */
export class CuckooFilter<T> {
	private readonly fingerprints: Uint8Array;
	private readonly hash: Hash32<T>;
	private readonly bucketCount: number;
	private readonly maxKicks: number;

	/** Fingerprints per bucket. */
	readonly bucketSize: number;

	private size = 0;
	/** Deterministic eviction choice, so a failure reproduces. */
	private evictionSeed = 0x9e3779b9;

	constructor(
		iterable: Iterable<T> | undefined,
		options: CuckooFilterOptions<T>,
	) {
		const { expectedItems } = options;
		const bucketSize = options.bucketSize ?? 4;

		if (!Number.isInteger(expectedItems) || expectedItems < 1) {
			throw new RangeError(
				`Expected items must be a positive integer, got ${expectedItems}`,
			);
		}

		if (!Number.isInteger(bucketSize) || bucketSize < 1 || bucketSize > 8) {
			throw new RangeError(
				`Bucket size must be an integer in [1, 8], got ${bucketSize}`,
			);
		}

		this.hash = options.hash;
		this.bucketSize = bucketSize;
		this.maxKicks = options.maxKicks ?? 500;

		// A power of two, so the XOR that pairs the two buckets stays in range.
		const needed = Math.ceil(expectedItems / bucketSize / 0.95);
		this.bucketCount = 2 ** Math.max(1, Math.ceil(Math.log2(needed)));

		this.fingerprints = new Uint8Array(this.bucketCount * bucketSize);

		if (iterable) {
			this.addAll(iterable);
		}
	}

	/** How many fingerprints are stored. */
	count(): number {
		return this.size;
	}

	/** The fraction of slots in use. */
	loadFactor(): number {
		return this.size / this.fingerprints.length;
	}

	clear(): void {
		this.fingerprints.fill(EMPTY);
		this.size = 0;
	}

	/**
	 * O(1) amortised.
	 *
	 * @returns `false` if the filter was too full to place the item, after
	 *   `maxKicks` relocations. The filter is rolled back to exactly its prior
	 *   contents, so nothing inserted earlier is lost.
	 */
	add(item: T): boolean {
		const fingerprint = this.fingerprintOf(item);
		const first = this.bucketOf(item);
		const second = this.alternateBucket(first, fingerprint);

		if (this.placeIn(first, fingerprint) || this.placeIn(second, fingerprint)) {
			this.size++;
			return true;
		}

		let bucket = (this.evictionSeed & 1) === 0 ? first : second;
		let carried = fingerprint;

		// Every slot overwritten, so a failed insert can be rolled back. Without
		// this the last displaced fingerprint has nowhere to go and is dropped,
		// which would turn a full filter into a false negative for an item that was
		// legitimately inserted earlier.
		const trail: { slot: number; previous: number }[] = [];

		for (let kick = 0; kick < this.maxKicks; kick++) {
			const slot = bucket * this.bucketSize + this.nextEvictionSlot();
			const displaced = this.fingerprints[slot] as number;

			trail.push({ slot, previous: displaced });

			this.fingerprints[slot] = carried;
			carried = displaced;

			bucket = this.alternateBucket(bucket, carried);

			if (this.placeIn(bucket, carried)) {
				this.size++;
				return true;
			}
		}

		for (let index = trail.length - 1; index >= 0; index--) {
			const { slot, previous } = trail[index] as {
				slot: number;
				previous: number;
			};

			this.fingerprints[slot] = previous;
		}

		return false;
	}

	/**
	 * @returns How many items were added. A shortfall means the filter filled up
	 *   — see `add`.
	 */
	addAll(items: Iterable<T>): number {
		let added = 0;

		for (const item of items) {
			if (this.add(item)) {
				added++;
			}
		}

		return added;
	}

	/**
	 * O(1), two bucket probes.
	 *
	 * @returns `false` means the item is **definitely** absent, provided only
	 *   inserted items were ever deleted. `true` means probably present.
	 */
	has(item: T): boolean {
		const fingerprint = this.fingerprintOf(item);
		const first = this.bucketOf(item);

		return (
			this.bucketHolds(first, fingerprint) ||
			this.bucketHolds(this.alternateBucket(first, fingerprint), fingerprint)
		);
	}

	/**
	 * Removes one copy of the item's fingerprint. O(1).
	 *
	 * @returns `true` if a matching fingerprint was removed. Deleting an item
	 *   never inserted can remove a colliding item's fingerprint instead, which
	 *   is the one way this filter can produce a false negative.
	 */
	delete(item: T): boolean {
		const fingerprint = this.fingerprintOf(item);
		const first = this.bucketOf(item);

		if (this.removeFrom(first, fingerprint)) {
			this.size--;
			return true;
		}

		if (
			this.removeFrom(this.alternateBucket(first, fingerprint), fingerprint)
		) {
			this.size--;
			return true;
		}

		return false;
	}

	/** A non-zero byte: zero is reserved for "empty slot". */
	private fingerprintOf(item: T): number {
		return ((this.hash(item, 1) >>> 0) % 255) + 1;
	}

	private bucketOf(item: T): number {
		return (this.hash(item, 0) >>> 0) & (this.bucketCount - 1);
	}

	/**
	 * The partner of `bucket` for this fingerprint.
	 *
	 * Must be an involution — applying it twice returns the original — or a
	 * relocated fingerprint becomes unfindable. That is why `bucketCount` is a
	 * power of two and the hash is **masked** rather than reduced modulo: XOR is
	 * self-inverse within a fixed bit width, but `(b ^ h) % n` is not, because
	 * the reduction discards the high bits the second XOR would need.
	 */
	private alternateBucket(bucket: number, fingerprint: number): number {
		const mask = this.bucketCount - 1;

		return (bucket ^ (Math.imul(fingerprint, 0x5bd1e995) & mask)) & mask;
	}

	private placeIn(bucket: number, fingerprint: number): boolean {
		const base = bucket * this.bucketSize;

		for (let slot = 0; slot < this.bucketSize; slot++) {
			if (this.fingerprints[base + slot] === EMPTY) {
				this.fingerprints[base + slot] = fingerprint;
				return true;
			}
		}

		return false;
	}

	private bucketHolds(bucket: number, fingerprint: number): boolean {
		const base = bucket * this.bucketSize;

		for (let slot = 0; slot < this.bucketSize; slot++) {
			if (this.fingerprints[base + slot] === fingerprint) {
				return true;
			}
		}

		return false;
	}

	private removeFrom(bucket: number, fingerprint: number): boolean {
		const base = bucket * this.bucketSize;

		for (let slot = 0; slot < this.bucketSize; slot++) {
			if (this.fingerprints[base + slot] === fingerprint) {
				this.fingerprints[base + slot] = EMPTY;
				return true;
			}
		}

		return false;
	}

	/** Xorshift32, so eviction is spread but reproducible. */
	private nextEvictionSlot(): number {
		let state = this.evictionSeed;

		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;

		this.evictionSeed = state | 0;

		return Math.abs(state) % this.bucketSize;
	}
}
