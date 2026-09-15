import type { IMultimap } from "./imultimap.js";

/**
 * A key associated with many values, backed by a `Map` of arrays.
 *
 * This is a **list** multimap: a key may hold the same value more than once,
 * and the values of a key keep their insertion order. That is the more
 * primitive of the two shapes — a set-multimap can be built over this one,
 * whereas recovering duplicates from a set-multimap is impossible. `add` never
 * deduplicates; use `hasEntry` first if a key must hold a value only once.
 *
 * `count()` is the total number of `(key, value)` entries across every key: a
 * key holding three values contributes three. `keyCount()` is the number of
 * distinct keys.
 *
 * Time complexity: O(1) for `add`, `has`, `countFor` and `keyCount`; O(1) for
 * `delete` of a whole key; O(k) for `hasEntry`/`deleteEntry` in the number of
 * values held under that key. Keys and values are compared by `SameValueZero`.
 *
 * @template K The key type.
 * @template V The value type.
 */
export class MultiMap<K, V> implements IMultimap<K, V> {
	private readonly buckets = new Map<K, V[]>();

	/** Maintained incrementally: summing the buckets per call would be O(k). */
	private size = 0;

	constructor(iterable?: Iterable<readonly [K, V]>) {
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

	/** The values held under `key`, in insertion order. Empty when absent. */
	*get(key: K): IterableIterator<V> {
		const bucket = this.buckets.get(key);

		if (bucket === undefined) {
			return;
		}

		for (let index = 0; index < bucket.length; index++) {
			yield bucket[index]!;
		}
	}

	/** O(1). Appends even when `key` already holds `value`. */
	add(key: K, value: V): void {
		const bucket = this.buckets.get(key);

		if (bucket === undefined) {
			this.buckets.set(key, [value]);
		} else {
			bucket.push(value);
		}

		this.size++;
	}

	/** O(m) in the number of values. */
	addAll(key: K, values: Iterable<V>): void {
		let bucket = this.buckets.get(key);

		if (bucket === undefined) {
			bucket = [];
			this.buckets.set(key, bucket);
		}

		for (const value of values) {
			bucket.push(value);
			this.size++;
		}

		// A key that received nothing must not linger as an empty bucket, or
		// `has`/`keyCount` would report a key holding no entries.
		if (bucket.length === 0) {
			this.buckets.delete(key);
		}
	}

	/** O(1). Whether `key` holds at least one value. */
	has(key: K): boolean {
		return this.buckets.has(key);
	}

	/** O(k) in the number of values held under `key`. */
	hasEntry(key: K, value: V): boolean {
		return this.buckets.get(key)?.includes(value) ?? false;
	}

	/**
	 * Removes `key` and every value under it. O(1).
	 *
	 * @returns How many entries were removed.
	 */
	delete(key: K): number {
		const bucket = this.buckets.get(key);

		if (bucket === undefined) {
			return 0;
		}

		this.buckets.delete(key);
		this.size -= bucket.length;

		return bucket.length;
	}

	/**
	 * Removes one occurrence of `value` under `key` — the first, since values
	 * keep their insertion order. O(k).
	 *
	 * @returns `true` if an entry was removed.
	 */
	deleteEntry(key: K, value: V): boolean {
		const bucket = this.buckets.get(key);

		if (bucket === undefined) {
			return false;
		}

		const index = bucket.indexOf(value);

		if (index === -1) {
			return false;
		}

		bucket.splice(index, 1);
		this.size--;

		if (bucket.length === 0) {
			this.buckets.delete(key);
		}

		return true;
	}

	/** O(1). */
	countFor(key: K): number {
		return this.buckets.get(key)?.length ?? 0;
	}

	/** The number of distinct keys. O(1). */
	keyCount(): number {
		return this.buckets.size;
	}

	/** Each distinct key once, in first-insertion order. */
	keys(): IterableIterator<K> {
		return this.buckets.keys();
	}

	/** Every `(key, value)` pair, grouped by key. */
	*entries(): IterableIterator<readonly [K, V]> {
		for (const [key, bucket] of this.buckets) {
			for (let index = 0; index < bucket.length; index++) {
				yield [key, bucket[index]!];
			}
		}
	}
}
