import { popCount32 } from "@ac-kit/core";

import type { Hash32 } from "./hash32.js";

export type BloomFilterOptions<T> = {
	/** See {@link Hash32}: required, and why it cannot be defaulted. */
	hash: Hash32<T>;

	/** How many items the filter is sized for. */
	expectedItems: number;
	/**
	 * The false-positive probability to size for, at `expectedItems`. Defaults to
	 * `0.01` (1%). Must be in `(0, 1)`.
	 */
	falsePositiveRate?: number;
};

const BITS_PER_WORD = 32;
const WORD_SHIFT = 5;
const WORD_MASK = BITS_PER_WORD - 1;

/**
 * Approximate set membership in a fraction of the space an exact set needs.
 *
 * `has` has **no false negatives and does have false positives**: "no" is
 * certain, "yes" means "probably". That asymmetry is the whole point — it makes
 * a Bloom filter a safe front door for an expensive exact lookup, never a
 * replacement for one.
 *
 * There is no `delete`: clearing a bit would clear it for every other item that
 * happens to hash onto it, turning "no false negatives" into a lie. Use
 * `CuckooFilter` when deletion is needed.
 *
 * Sizing follows the standard derivation from `expectedItems` (n) and
 * `falsePositiveRate` (p): `m = ceil(-n·ln p / (ln 2)²)` bits and `k =
 * round((m/n)·ln 2)` hashes, which is the k that minimises p for that m.
 * Exceeding `expectedItems` does not break the filter, it just raises the real
 * false-positive rate above the one asked for — `estimatedFalsePositiveRate()`
 * reports where it actually stands.
 *
 * The `k` hashes come from two calls to the caller's `hash` combined as `h1 +
 * i·h2` (Kirsch–Mitzenmacher), which is proven to cost nothing in accuracy
 * versus `k` independent hashes.
 *
 * Time complexity: O(k) for `add` and `has`, independent of how many items are
 * held. Space: `m` bits regardless of item size.
 *
 * @template T The item type.
 */
export class BloomFilter<T> {
	private readonly words: Uint32Array;
	private readonly hash: Hash32<T>;
	private added = 0;

	/** Bits in the filter. */
	readonly bitCount: number;
	/** Hashes per operation. */
	readonly hashCount: number;

	constructor(
		iterable: Iterable<T> | undefined,
		options: BloomFilterOptions<T>,
	) {
		const { expectedItems } = options;
		const falsePositiveRate = options.falsePositiveRate ?? 0.01;

		if (!Number.isInteger(expectedItems) || expectedItems < 1) {
			throw new RangeError(
				`Expected items must be a positive integer, got ${expectedItems}`,
			);
		}

		if (
			!Number.isFinite(falsePositiveRate) ||
			falsePositiveRate <= 0 ||
			falsePositiveRate >= 1
		) {
			throw new RangeError(
				`False-positive rate must be in (0, 1), got ${falsePositiveRate}`,
			);
		}

		this.hash = options.hash;
		this.bitCount = Math.max(
			BITS_PER_WORD,
			Math.ceil((-expectedItems * Math.log(falsePositiveRate)) / Math.LN2 ** 2),
		);
		this.hashCount = Math.max(
			1,
			Math.round((this.bitCount / expectedItems) * Math.LN2),
		);

		this.words = new Uint32Array((this.bitCount + WORD_MASK) >>> WORD_SHIFT);

		if (iterable) {
			this.addAll(iterable);
		}
	}

	/**
	 * How many times `add` was called with an item not already certainly present.
	 * An estimate of the set's size, not an exact count.
	 */
	count(): number {
		return this.added;
	}

	clear(): void {
		this.words.fill(0);
		this.added = 0;
	}

	/** O(k), with exactly two hash calls regardless of k. */
	add(item: T): void {
		const first = this.hash(item, 0) >>> 0;
		const second = this.hash(item, 1) >>> 0;
		let novel = false;

		for (let index = 0; index < this.hashCount; index++) {
			const bit = this.bitAt(first, second, index);
			const wordIndex = bit >>> WORD_SHIFT;
			const mask = 1 << (bit & WORD_MASK);

			if ((this.words[wordIndex]! & mask) === 0) {
				this.words[wordIndex]! |= mask;
				novel = true;
			}
		}

		if (novel) {
			this.added++;
		}
	}

	/** O(m·k) in the number of items. */
	addAll(items: Iterable<T>): void {
		for (const item of items) {
			this.add(item);
		}
	}

	/**
	 * O(k), with exactly two hash calls regardless of k.
	 *
	 * @returns `false` means the item is **definitely** absent. `true` means it
	 *   is probably present — see `estimatedFalsePositiveRate`.
	 */
	has(item: T): boolean {
		const first = this.hash(item, 0) >>> 0;
		const second = this.hash(item, 1) >>> 0;

		for (let index = 0; index < this.hashCount; index++) {
			const bit = this.bitAt(first, second, index);

			if ((this.words[bit >>> WORD_SHIFT]! & (1 << (bit & WORD_MASK))) === 0) {
				return false;
			}
		}

		return true;
	}

	/**
	 * The false-positive probability at the filter's current fill, from the
	 * fraction of bits actually set: `(setBits / bitCount) ^ hashCount`.
	 *
	 * Measured rather than assumed, so it stays honest after more items were
	 * added than the filter was sized for. O(bitCount / 32).
	 */
	estimatedFalsePositiveRate(): number {
		let setBits = 0;

		for (let index = 0; index < this.words.length; index++) {
			setBits += popCount32(this.words[index]!);
		}

		return (setBits / this.bitCount) ** this.hashCount;
	}

	/**
	 * Folds `other` into this filter, so it holds the union of both item sets.
	 *
	 * Merging is exact — the union of two Bloom filters is the Bloom filter of
	 * the union — which is what makes these usable across partitions.
	 *
	 * @throws {RangeError} If the two filters were not sized identically. Bitwise
	 *   union is only meaningful between filters with the same geometry.
	 */
	merge(other: BloomFilter<T>): void {
		if (
			other.bitCount !== this.bitCount ||
			other.hashCount !== this.hashCount
		) {
			throw new RangeError(
				"Cannot merge Bloom filters with different bit or hash counts",
			);
		}

		for (let index = 0; index < this.words.length; index++) {
			this.words[index]! |= other.words[index]!;
		}

		// Neither side knows the overlap, so this can only over-count; it is an
		// estimate either way.
		this.added += other.added;
	}

	/**
	 * Kirsch-Mitzenmacher: two hashes generate k indices with no measurable loss
	 * against k independent ones. Both are hoisted by the callers, so a k-hash
	 * filter still costs two calls to the caller's `hash`, not 2k.
	 */
	private bitAt(first: number, second: number, index: number): number {
		return ((first + Math.imul(index, second)) >>> 0) % this.bitCount;
	}
}
