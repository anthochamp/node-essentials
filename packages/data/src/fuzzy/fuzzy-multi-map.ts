import type { IMultimap } from "../multimap/imultimap.js";
import type { KeyNormalizer } from "./fuzzy-map.js";

export type FuzzyMultiMapOptions<K> = {
	/** Required: without one this would just be a `MultiMap`. */
	normalize: KeyNormalizer<K>;
};

type Bucket<K, V> = { key: K; values: V[] };

/**
 * A multimap whose keys match after a caller-supplied normalisation.
 *
 * `FuzzyMap`'s normalisation with `MultiMap`'s one-key-many-values shape: keys
 * that normalise together share a bucket, and the bucket keeps every value in
 * insertion order, duplicates included.
 *
 * As in `FuzzyMap`, the first key to claim a normalised bucket is the one
 * `keys()` reports, so the original spelling survives for display.
 *
 * Time complexity: O(1) plus `normalize` for `add`, `has`, `countFor` and
 * `delete`; O(k) for `hasEntry`/`deleteEntry` in the bucket's size.
 *
 * @template K The key type as callers see it.
 * @template V The value type.
 */
export class FuzzyMultiMap<K, V> implements IMultimap<K, V> {
	private readonly buckets = new Map<unknown, Bucket<K, V>>();
	private readonly normalize: KeyNormalizer<K>;

	private size = 0;

	constructor(
		iterable: Iterable<readonly [K, V]> | undefined,
		options: FuzzyMultiMapOptions<K>,
	) {
		this.normalize = options.normalize;

		if (iterable) {
			for (const [key, value] of iterable) {
				this.add(key, value);
			}
		}
	}

	*[Symbol.iterator](): Iterator<readonly [K, V]> {
		yield* this.entries();
	}

	/** The total number of `(key, value)` entries, not the number of keys. */
	count(): number {
		return this.size;
	}

	clear(): void {
		this.buckets.clear();
		this.size = 0;
	}

	/** The values under whatever `key` normalises to, in insertion order. */
	*get(key: K): IterableIterator<V> {
		const bucket = this.buckets.get(this.normalize(key));

		if (bucket === undefined) {
			return;
		}

		for (let index = 0; index < bucket.values.length; index++) {
			yield bucket.values[index]!;
		}
	}

	/** O(1) plus `normalize`. Appends even when the value is already present. */
	add(key: K, value: V): void {
		this.bucketFor(key).values.push(value);
		this.size++;
	}

	/** O(m) in the number of values. */
	addAll(key: K, values: Iterable<V>): void {
		const bucket = this.bucketFor(key);

		for (const value of values) {
			bucket.values.push(value);
			this.size++;
		}

		if (bucket.values.length === 0) {
			this.buckets.delete(this.normalize(key));
		}
	}

	/** O(1) plus `normalize`. */
	has(key: K): boolean {
		return this.buckets.has(this.normalize(key));
	}

	/** O(k) in the bucket's size. */
	hasEntry(key: K, value: V): boolean {
		return (
			this.buckets.get(this.normalize(key))?.values.includes(value) ?? false
		);
	}

	/**
	 * Removes the whole bucket `key` normalises to. O(1) plus `normalize`.
	 *
	 * @returns How many entries were removed.
	 */
	delete(key: K): number {
		const normalized = this.normalize(key);
		const bucket = this.buckets.get(normalized);

		if (bucket === undefined) {
			return 0;
		}

		this.buckets.delete(normalized);
		this.size -= bucket.values.length;

		return bucket.values.length;
	}

	/** Removes the first occurrence of `value` in the bucket. O(k). */
	deleteEntry(key: K, value: V): boolean {
		const normalized = this.normalize(key);
		const bucket = this.buckets.get(normalized);

		if (bucket === undefined) {
			return false;
		}

		const index = bucket.values.indexOf(value);

		if (index === -1) {
			return false;
		}

		bucket.values.splice(index, 1);
		this.size--;

		if (bucket.values.length === 0) {
			this.buckets.delete(normalized);
		}

		return true;
	}

	/** O(1) plus `normalize`. */
	countFor(key: K): number {
		return this.buckets.get(this.normalize(key))?.values.length ?? 0;
	}

	/** The number of distinct normalised keys. O(1). */
	keyCount(): number {
		return this.buckets.size;
	}

	/** Each bucket's stored key, in its original form. */
	*keys(): IterableIterator<K> {
		for (const bucket of this.buckets.values()) {
			yield bucket.key;
		}
	}

	/** Every pair, grouped by bucket, each key in its original form. */
	*entries(): IterableIterator<readonly [K, V]> {
		for (const bucket of this.buckets.values()) {
			for (let index = 0; index < bucket.values.length; index++) {
				yield [bucket.key, bucket.values[index]!];
			}
		}
	}

	/** The key actually stored for whatever `key` normalises to. */
	storedKey(key: K): K | undefined {
		return this.buckets.get(this.normalize(key))?.key;
	}

	private bucketFor(key: K): Bucket<K, V> {
		const normalized = this.normalize(key);
		let bucket = this.buckets.get(normalized);

		if (bucket === undefined) {
			bucket = { key, values: [] };
			this.buckets.set(normalized, bucket);
		}

		return bucket;
	}
}
