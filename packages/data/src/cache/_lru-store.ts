/**
 * Shared engine for `LruCache` and `LruMap`: a `Map` from key to node, plus an
 * intrusive doubly-linked recency list threaded through those nodes.
 *
 * The list runs most-recently-used at `head` to least-recently-used at `tail`,
 * so eviction is `tail` and a touch is an unlink-plus-relink. Every operation
 * is O(1).
 *
 * **The delete contract, settled here.** `mnemonist` ships a separate
 * `…WithDelete` variant of each of its LRU structures because its nodes live in
 * flat typed-array pools addressed by index: freeing one needs a free list, so
 * deletion is not free and it is offered as a different type. This store uses
 * real node objects in a `Map` instead, which makes `delete` genuinely O(1)
 * with no tombstone and no compaction — the garbage collector reclaims the
 * node. The trade is memory density: a node object per entry costs more than a
 * slot in a packed array, and iteration is pointer-chasing rather than a linear
 * scan. That is the right trade for a general-purpose cache, and it is why
 * there is no `LruCacheWithDelete` here.
 *
 * Keys are compared by `Map` semantics (`SameValueZero`). A cache exists to be
 * fast, and an arbitrary equality cannot be hashed — see `EnhancedSet` for the
 * caller-supplied-equality set, which is linear by construction.
 */
type LruNode<K, V> = {
	readonly key: K;
	value: V;
	prev: LruNode<K, V> | null;
	next: LruNode<K, V> | null;
};

export class LruStore<K, V> {
	private readonly nodes = new Map<K, LruNode<K, V>>();

	/** Most recently used. */
	private head: LruNode<K, V> | null = null;
	/** Least recently used — the eviction victim. */
	private tail: LruNode<K, V> | null = null;

	constructor(readonly capacity: number) {
		if (!Number.isInteger(capacity) || capacity < 0) {
			throw new RangeError(
				`Capacity must be a non-negative integer, got ${capacity}`,
			);
		}
	}

	count(): number {
		return this.nodes.size;
	}

	clear(): void {
		this.nodes.clear();
		this.head = null;
		this.tail = null;
	}

	/** O(1). Does not count as a use. */
	has(key: K): boolean {
		return this.nodes.has(key);
	}

	/** O(1). Does not count as a use, so it cannot change the eviction order. */
	peek(key: K): V | undefined {
		return this.nodes.get(key)?.value;
	}

	/** The entry `set` would evict next, or `undefined` when empty. O(1). */
	leastRecent(): readonly [K, V] | undefined {
		const { tail } = this;

		return tail === null ? undefined : [tail.key, tail.value];
	}

	/** O(1). Counts as a use: the entry becomes the most recently used. */
	get(key: K): V | undefined {
		const node = this.nodes.get(key);

		if (node === undefined) {
			return undefined;
		}

		this.touch(node);

		return node.value;
	}

	/**
	 * O(1). Counts as a use.
	 *
	 * @returns The evicted entry, or `undefined` if nothing was evicted.
	 *   Overwriting an existing key never evicts.
	 */
	set(key: K, value: V): readonly [K, V] | undefined {
		const existing = this.nodes.get(key);

		if (existing !== undefined) {
			existing.value = value;
			this.touch(existing);
			return undefined;
		}

		// A zero capacity holds nothing, so the incoming entry is itself the
		// casualty — storing it first and evicting it back out would be the same
		// answer through more work.
		if (this.capacity === 0) {
			return [key, value];
		}

		let evicted: readonly [K, V] | undefined;

		if (this.nodes.size >= this.capacity) {
			const victim = this.tail as LruNode<K, V>;

			evicted = [victim.key, victim.value];
			this.unlink(victim);
			this.nodes.delete(victim.key);
		}

		const node: LruNode<K, V> = { key, value, prev: null, next: this.head };

		if (this.head !== null) {
			this.head.prev = node;
		}
		this.head = node;
		this.tail ??= node;

		this.nodes.set(key, node);

		return evicted;
	}

	/** O(1) — no tombstone, no compaction. See the note on this module. */
	delete(key: K): boolean {
		const node = this.nodes.get(key);

		if (node === undefined) {
			return false;
		}

		this.unlink(node);
		this.nodes.delete(key);

		return true;
	}

	/** Most recently used first. */
	*entries(): IterableIterator<readonly [K, V]> {
		for (let node = this.head; node !== null; node = node.next) {
			yield [node.key, node.value];
		}
	}

	/** Most recently used first. */
	*keys(): IterableIterator<K> {
		for (let node = this.head; node !== null; node = node.next) {
			yield node.key;
		}
	}

	/** Most recently used first. */
	*values(): IterableIterator<V> {
		for (let node = this.head; node !== null; node = node.next) {
			yield node.value;
		}
	}

	private touch(node: LruNode<K, V>): void {
		if (this.head === node) {
			return;
		}

		this.unlink(node);

		node.prev = null;
		node.next = this.head;

		if (this.head !== null) {
			this.head.prev = node;
		}

		this.head = node;
		this.tail ??= node;
	}

	private unlink(node: LruNode<K, V>): void {
		if (node.prev !== null) {
			node.prev.next = node.next;
		} else {
			this.head = node.next;
		}

		if (node.next !== null) {
			node.next.prev = node.prev;
		} else {
			this.tail = node.prev;
		}

		node.prev = null;
		node.next = null;
	}
}
