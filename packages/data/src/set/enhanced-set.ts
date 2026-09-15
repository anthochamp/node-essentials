import {
	type EqualityComparator,
	type EqualityComparisonStrategy,
	resolveEqualityComparator,
} from "@ac-kit/core";

import { ISet } from "./iset.js";

export type EnhancedSetOptions<T> = {
	/**
	 * How two elements are told apart. Defaults to `"sameValueZero"`, matching
	 * native `Set`.
	 *
	 * Anything other than a well-known strategy makes every membership test a
	 * linear scan — see the complexity note on the class.
	 */
	comparisonStrategy?: EqualityComparisonStrategy<T, T>;
};

/**
 * A set with caller-supplied equality.
 *
 * Native `Set` is locked to `SameValueZero`, and so are `@ac-kit/algo`'s
 * `union`/`intersection`/… free functions, which are built on it. This type
 * exists to escape that: two elements are equal when _this set's_ comparator
 * says so, and the algebra below is implemented here rather than delegated,
 * because delegating would silently discard the caller's equality.
 *
 * Time complexity: an arbitrary equality cannot be hashed, so membership is a
 * linear scan and the algebra is pairwise.
 *
 * - `has`/`add`/`delete`: O(n)
 * - `union`/`intersection`/`difference`/`symmetricDifference`: O(n·m)
 * - `isSubsetOf`/`isSupersetOf`/`isDisjointFrom`: O(n·m)
 *
 * Space complexity: O(n). Reach for a native `Set` when `SameValueZero` is what
 * you actually want — it is O(1) per operation and this is not.
 *
 * @template T The type of elements. Anything except `undefined`.
 */
export class EnhancedSet<T> implements ISet<T> {
	private readonly items: T[] = [];
	private readonly equals: EqualityComparator<T, T>;

	constructor(iterable?: Iterable<T>, options?: EnhancedSetOptions<T>) {
		// Resolved once: `isEqual` would re-enter its switch on every comparison,
		// and every operation here compares per element.
		this.equals = resolveEqualityComparator<T, T>(
			options?.comparisonStrategy ?? "sameValueZero",
		);

		if (iterable) {
			this.addAll(iterable);
		}
	}

	[Symbol.iterator](): Iterator<T> {
		return this.items[Symbol.iterator]();
	}

	count(): number {
		return this.items.length;
	}

	clear(): void {
		this.items.length = 0;
	}

	/** O(n): the incoming element is compared against every element held. */
	add(item: T): void {
		if (this.indexOf(item) === -1) {
			this.items.push(item);
		}
	}

	/** O(n·m) in the size of this set and of `items`. */
	addAll(items: Iterable<T>): void {
		for (const item of items) {
			this.add(item);
		}
	}

	/** O(n). */
	delete(item: T): boolean {
		const index = this.indexOf(item);

		if (index === -1) {
			return false;
		}

		// Order is not part of a set's contract, so the last element backfills the
		// hole rather than shifting the tail.
		const last = this.items.pop() as T;

		if (index < this.items.length) {
			this.items[index] = last;
		}

		return true;
	}

	/** O(n). */
	has(item: T): boolean {
		return this.indexOf(item) !== -1;
	}

	/** O(n·m). */
	union(other: Iterable<T>): EnhancedSet<T> {
		const result = this.emptyLike();

		// Already distinct under this equality, so they can be copied without
		// re-testing membership.
		for (let index = 0; index < this.items.length; index++) {
			result.items.push(this.items[index]!);
		}

		result.addAll(other);

		return result;
	}

	/** O(n·m). */
	intersection(other: Iterable<T>): EnhancedSet<T> {
		const otherSet = this.like(other);
		const result = this.emptyLike();

		for (let index = 0; index < this.items.length; index++) {
			const item = this.items[index]!;

			if (otherSet.has(item)) {
				result.items.push(item);
			}
		}

		return result;
	}

	/** O(n·m). */
	difference(other: Iterable<T>): EnhancedSet<T> {
		const otherSet = this.like(other);
		const result = this.emptyLike();

		for (let index = 0; index < this.items.length; index++) {
			const item = this.items[index]!;

			if (!otherSet.has(item)) {
				result.items.push(item);
			}
		}

		return result;
	}

	/** O(n·m). */
	symmetricDifference(other: Iterable<T>): EnhancedSet<T> {
		const otherSet = this.like(other);
		const result = this.difference(otherSet);

		for (let index = 0; index < otherSet.items.length; index++) {
			const item = otherSet.items[index]!;

			if (!this.has(item)) {
				result.items.push(item);
			}
		}

		return result;
	}

	/** O(n·m). */
	isSubsetOf(other: Iterable<T>): boolean {
		const otherSet = this.like(other);

		for (let index = 0; index < this.items.length; index++) {
			if (!otherSet.has(this.items[index]!)) {
				return false;
			}
		}

		return true;
	}

	/** O(n·m). */
	isSupersetOf(other: Iterable<T>): boolean {
		for (const item of other) {
			if (!this.has(item)) {
				return false;
			}
		}

		return true;
	}

	/** O(n·m). */
	isDisjointFrom(other: Iterable<T>): boolean {
		for (const item of other) {
			if (this.has(item)) {
				return false;
			}
		}

		return true;
	}

	private indexOf(item: T): number {
		const { items, equals } = this;

		for (let index = 0; index < items.length; index++) {
			if (equals(items[index]!, item)) {
				return index;
			}
		}

		return -1;
	}

	/** A new set carrying this one's equality — never the default. */
	private emptyLike(): EnhancedSet<T> {
		return new EnhancedSet<T>(undefined, { comparisonStrategy: this.equals });
	}

	private like(other: Iterable<T>): EnhancedSet<T> {
		// Already this set's equality, so it can be read directly.
		if (other instanceof EnhancedSet && other.equals === this.equals) {
			return other;
		}

		return new EnhancedSet<T>(other, { comparisonStrategy: this.equals });
	}
}
