import { DefinedValue } from "@ac-kit/core";

import type { IDisjointSet } from "./idisjoint-set.js";

/**
 * Union-find: tracks a partition of items into disjoint sets, answering "are
 * these two in the same set" and merging two sets, both in near-constant time.
 *
 * "Static" names the shape of the problem, not the API — sets only ever merge,
 * never split, which is what allows the flattening that makes it fast. Items
 * may be added at any time.
 *
 * Both optimisations are present: **path compression** on `find` (every node
 * walked is re-pointed straight at the root) and **union by rank** (the
 * shallower tree is hung under the deeper one). Together they give O(α(n))
 * amortised per operation, where α is the inverse Ackermann function — at most
 * 4 for any n that fits in memory, so constant in practice.
 *
 * Items are compared by `SameValueZero`, native `Map` semantics.
 *
 * @template T The item type.
 */
export class StaticDisjointSet<
	T extends DefinedValue = DefinedValue,
> implements IDisjointSet<T> {
	private readonly indices = new Map<T, number>();
	private readonly items: T[] = [];
	private readonly parents: number[] = [];
	/**
	 * Upper bound on tree height, not an exact height: path compression lowers
	 * the real one.
	 */
	private readonly ranks: number[] = [];

	private sets = 0;

	constructor(iterable?: Iterable<T>) {
		if (iterable) {
			this.makeSets(iterable);
		}
	}

	/** The number of disjoint sets, not the number of items. O(1). */
	setCount(): number {
		return this.sets;
	}

	/** The number of items across every set. O(1). */
	count(): number {
		return this.items.length;
	}

	/** Adds `item` as a set of its own. A no-op if it is already known. O(1). */
	makeSet(item: T): void {
		if (this.indices.has(item)) {
			return;
		}

		const index = this.items.length;

		this.indices.set(item, index);
		this.items.push(item);
		this.parents.push(index);
		this.ranks.push(0);
		this.sets++;
	}

	/** O(m) in the number of items. */
	makeSets(items: Iterable<T>): void {
		for (const item of items) {
			this.makeSet(item);
		}
	}

	/** Whether `item` belongs to any set. O(1). */
	has(item: T): boolean {
		return this.indices.has(item);
	}

	/**
	 * The representative of `item`'s set — the same value for every member, and
	 * stable until the set is merged into another.
	 *
	 * @returns The representative, or `undefined` if `item` was never added.
	 */
	find(item: T): T | undefined {
		const index = this.indices.get(item);

		return index === undefined ? undefined : this.items[this.findRoot(index)];
	}

	/**
	 * Merges the sets holding `a` and `b`. Either operand not yet known is added
	 * first, so building a partition from a stream of pairs needs no separate
	 * `makeSet` pass; isolated items still do.
	 *
	 * @returns `true` if two distinct sets were merged, `false` if `a` and `b`
	 *   were already in the same one.
	 */
	union(a: T, b: T): boolean {
		this.makeSet(a);
		this.makeSet(b);

		let rootA = this.findRoot(this.indices.get(a) as number);
		let rootB = this.findRoot(this.indices.get(b) as number);

		if (rootA === rootB) {
			return false;
		}

		// Hang the shallower tree under the deeper one, so the result is no deeper
		// than the deeper input unless the two were equal.
		if (this.ranks[rootA]! < this.ranks[rootB]!) {
			[rootA, rootB] = [rootB, rootA];
		}

		this.parents[rootB] = rootA;

		if (this.ranks[rootA] === this.ranks[rootB]) {
			this.ranks[rootA]!++;
		}

		this.sets--;

		return true;
	}

	/**
	 * Whether `a` and `b` are in the same set. A query, so an unknown item is
	 * simply not connected to anything rather than being added.
	 */
	connected(a: T, b: T): boolean {
		const indexA = this.indices.get(a);
		const indexB = this.indices.get(b);

		if (indexA === undefined || indexB === undefined) {
			return false;
		}

		return this.findRoot(indexA) === this.findRoot(indexB);
	}

	/** Each set as its own array of members, in no particular order. O(n). */
	*groups(): IterableIterator<readonly T[]> {
		const groups = new Map<number, T[]>();

		for (let index = 0; index < this.items.length; index++) {
			const root = this.findRoot(index);
			const group = groups.get(root);

			if (group === undefined) {
				groups.set(root, [this.items[index]!]);
			} else {
				group.push(this.items[index]!);
			}
		}

		yield* groups.values();
	}

	private findRoot(index: number): number {
		const { parents } = this;

		let root = index;
		while (parents[root] !== root) {
			root = parents[root]!;
		}

		// Path compression, iterative: a recursive walk would blow the stack on a
		// long chain, which is exactly the shape this exists to flatten.
		let cursor = index;
		while (parents[cursor] !== root) {
			const next = parents[cursor]!;
			parents[cursor] = root;
			cursor = next;
		}

		return root;
	}
}
