import type { Callable, DefinedValue } from "@ac-kit/core";

import type { IMap } from "../map/imap.js";

/**
 * Reduces a key to the value lookups actually compare.
 *
 * Its result is compared by `SameValueZero`, so it must be a primitive — two
 * fresh objects never match, however equal they look.
 */
export type KeyNormalizer<K> = Callable<[key: K], unknown>;

export type FuzzyMapOptions<K> = {
	/** Required: without one this would just be a `Map`. */
	normalize: KeyNormalizer<K>;
};

type Entry<K, V> = { key: K; value: V };

/**
 * A map whose keys match after a caller-supplied normalisation.
 *
 * Case-insensitive lookup, accent folding, whitespace collapsing, phonetic keys
 * — all the same structure with a different function, rather than one class per
 * normalisation strategy. `normalize` is applied to every key on the way in and
 * to every query on the way out; whatever it maps together _is_ together.
 *
 * The **first** key to claim a normalised slot is the one `keys()` reports, and
 * a later `set` under an equivalent key updates the value without replacing the
 * stored key. So a map normalising by lower case, given `"Foo"` then `"FOO"`,
 * holds one entry keyed `"Foo"` — the original spelling survives, which is what
 * makes it usable for display.
 *
 * Time complexity: O(1) plus the cost of `normalize`, for every operation.
 *
 * @template K The key type as callers see it.
 * @template V The value type.
 */
export class FuzzyMap<K, V extends DefinedValue> implements IMap<K, V> {
	private readonly entries_ = new Map<unknown, Entry<K, V>>();
	private readonly normalize: KeyNormalizer<K>;

	constructor(
		iterable: Iterable<readonly [K, V]> | undefined,
		options: FuzzyMapOptions<K>,
	) {
		this.normalize = options.normalize;

		if (iterable) {
			for (const [key, value] of iterable) {
				this.set(key, value);
			}
		}
	}

	[Symbol.iterator](): Iterator<readonly [K, V]> {
		return this.entries();
	}

	count(): number {
		return this.entries_.size;
	}

	clear(): void {
		this.entries_.clear();
	}

	/** O(1) plus `normalize`. */
	get(key: K): V | undefined {
		return this.entries_.get(this.normalize(key))?.value;
	}

	/** O(1) plus `normalize`. Keeps the key already stored, if any. */
	set(key: K, value: V): void {
		const normalized = this.normalize(key);
		const existing = this.entries_.get(normalized);

		if (existing === undefined) {
			this.entries_.set(normalized, { key, value });
		} else {
			existing.value = value;
		}
	}

	/** O(1) plus `normalize`. */
	has(key: K): boolean {
		return this.entries_.has(this.normalize(key));
	}

	/** O(1) plus `normalize`. */
	delete(key: K): boolean {
		return this.entries_.delete(this.normalize(key));
	}

	/** The stored keys, in their original form, in first-insertion order. */
	*keys(): IterableIterator<K> {
		for (const entry of this.entries_.values()) {
			yield entry.key;
		}
	}

	/** In first-insertion order. */
	*values(): IterableIterator<V> {
		for (const entry of this.entries_.values()) {
			yield entry.value;
		}
	}

	/** In first-insertion order, each key in its original form. */
	*entries(): IterableIterator<readonly [K, V]> {
		for (const entry of this.entries_.values()) {
			yield [entry.key, entry.value];
		}
	}

	/**
	 * The key actually stored for whatever `key` normalises to.
	 *
	 * Answers "which spelling won" without going through `keys()`: the stored key
	 * and the query can differ, which is the whole point of this type.
	 */
	storedKey(key: K): K | undefined {
		return this.entries_.get(this.normalize(key))?.key;
	}
}
