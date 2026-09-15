import { DefinedValue } from "@ac-kit/core";

import type { ITrie } from "./itrie.js";

/** A node of a {@link Trie}. Mutable: the trie owns every field. */
export type TrieNode<S, V> = {
	/** Keyed by segment; `SameValueZero`, native `Map` semantics. */
	readonly children: Map<S, TrieNode<S, V>>;
	/** Separate from `value` so that `undefined` is a storable value. */
	terminal: boolean;
	value: V | undefined;
	readonly parent: TrieNode<S, V> | null;
	/** The segment that reaches this node from its parent. */
	readonly segment: S | undefined;
};

const createNode = <S, V>(
	parent: TrieNode<S, V> | null,
	segment: S | undefined,
): TrieNode<S, V> => ({
	children: new Map(),
	terminal: false,
	value: undefined,
	parent,
	segment,
});

/**
 * A prefix tree over sequences of a caller-chosen segment type.
 *
 * Generic over the segment, not hard-coded to `string`/`char`: a key is a
 * `readonly S[]`, so `S` can be a character, a path component, a token, an enum
 * member. Split the string yourself and the same structure indexes routes,
 * namespaces or n-grams without a second implementation.
 *
 * What a trie buys over a `Map` is prefix access: `withPrefix`, `hasPrefix` and
 * `longestPrefixOf` are what a hash map cannot answer at all. A plain `Map` is
 * faster for exact lookup and should be preferred when that is all that is
 * needed.
 *
 * Time complexity, for a key of `k` segments: O(k) for `get`, `set`, `has` and
 * `delete` — independent of how many keys are stored. `withPrefix` is O(k +
 * size of the subtree). Space is O(total segments), shared across common
 * prefixes.
 *
 * @template S The segment type.
 * @template V The value type.
 */
export class Trie<S, V extends DefinedValue> implements ITrie<S, V> {
	private readonly root: TrieNode<S, V> = createNode<S, V>(null, undefined);
	private size = 0;

	constructor(iterable?: Iterable<readonly [readonly S[], V]>) {
		if (iterable) {
			for (const [key, value] of iterable) {
				this.set(key, value);
			}
		}
	}

	[Symbol.iterator](): Iterator<readonly [readonly S[], V]> {
		return this.entries();
	}

	/** The number of stored keys. O(1). */
	count(): number {
		return this.size;
	}

	clear(): void {
		this.root.children.clear();
		this.root.terminal = false;
		this.root.value = undefined;
		this.size = 0;
	}

	/** O(k). */
	get(key: readonly S[]): V | undefined {
		const node = this.nodeAt(key);

		return node?.terminal === true ? node.value : undefined;
	}

	/**
	 * O(k). Overwrites a key already stored.
	 *
	 * The empty key is legal and addresses the root, so a trie can carry a
	 * "default" value alongside its prefixed ones.
	 */
	set(key: readonly S[], value: V): void {
		let node = this.root;

		for (let index = 0; index < key.length; index++) {
			const segment = key[index] as S;
			let child = node.children.get(segment);

			if (child === undefined) {
				child = createNode(node, segment);
				node.children.set(segment, child);
			}

			node = child;
		}

		if (!node.terminal) {
			node.terminal = true;
			this.size++;
		}

		node.value = value;
	}

	/**
	 * O(k). Whether this exact key is stored — see `hasPrefix` for the other
	 * question.
	 */
	has(key: readonly S[]): boolean {
		return this.nodeAt(key)?.terminal === true;
	}

	/** O(k). Prunes every node left holding neither a value nor a child. */
	delete(key: readonly S[]): boolean {
		const node = this.nodeAt(key);

		if (node === undefined || !node.terminal) {
			return false;
		}

		node.terminal = false;
		node.value = undefined;
		this.size--;

		let current: TrieNode<S, V> | null = node;

		while (
			current !== null &&
			current.parent !== null &&
			!current.terminal &&
			current.children.size === 0
		) {
			current.parent.children.delete(current.segment as S);
			current = current.parent;
		}

		return true;
	}

	/** Every stored key, in depth-first order. */
	*keys(): IterableIterator<readonly S[]> {
		for (const [key] of this.entries()) {
			yield key;
		}
	}

	/** Every stored value, in the same order as `keys`. */
	*values(): IterableIterator<V> {
		for (const [, value] of this.entries()) {
			yield value;
		}
	}

	/** Every stored entry, in depth-first order. */
	entries(): IterableIterator<readonly [readonly S[], V]> {
		return this.walk(this.root, []);
	}

	/**
	 * Every entry whose key starts with `prefix`, including `prefix` itself when
	 * it is stored. O(k + the size of the subtree).
	 */
	withPrefix(
		prefix: readonly S[],
	): IterableIterator<readonly [readonly S[], V]> {
		const node = this.nodeAt(prefix);

		if (node === undefined) {
			return [][Symbol.iterator]();
		}

		return this.walk(node, Array.from(prefix));
	}

	/**
	 * Whether any stored key starts with `prefix`. O(k).
	 *
	 * Distinct from `has`: a prefix can exist as a path without being a key.
	 */
	hasPrefix(prefix: readonly S[]): boolean {
		return this.nodeAt(prefix) !== undefined;
	}

	/**
	 * The longest stored key that is a prefix of `key`, or `undefined` if none
	 * is. O(k).
	 *
	 * This is the lookup behind longest-prefix routing and dictionary matching:
	 * the whole point of holding the keys in a trie rather than a `Map`.
	 */
	longestPrefixOf(key: readonly S[]): readonly S[] | undefined {
		let node = this.root;
		let longest = node.terminal ? 0 : -1;

		for (let index = 0; index < key.length; index++) {
			const child = node.children.get(key[index] as S);

			if (child === undefined) {
				break;
			}

			node = child;

			if (node.terminal) {
				longest = index + 1;
			}
		}

		return longest === -1 ? undefined : key.slice(0, longest);
	}

	private nodeAt(key: readonly S[]): TrieNode<S, V> | undefined {
		let node: TrieNode<S, V> | undefined = this.root;

		for (let index = 0; index < key.length; index++) {
			node = node.children.get(key[index] as S);

			if (node === undefined) {
				return undefined;
			}
		}

		return node;
	}

	/**
	 * Depth-first from `node`, `path` being the segments that reach it.
	 *
	 * `path` is mutated as the walk descends and each yielded key is a copy, so
	 * the traversal allocates one array per _result_ rather than one per node.
	 */
	private *walk(
		node: TrieNode<S, V>,
		path: S[],
	): IterableIterator<readonly [readonly S[], V]> {
		if (node.terminal) {
			yield [path.slice(), node.value as V];
		}

		for (const [segment, child] of node.children) {
			path.push(segment);
			yield* this.walk(child, path);
			path.pop();
		}
	}
}
