import { ctz32 } from "@ac-kit/core";

import { ISet } from "../set/iset.js";
import { BitSet } from "./bit-set.js";

const BITS_PER_WORD = 32;
const WORD_SHIFT = 5;
const WORD_MASK = BITS_PER_WORD - 1;
const MIN_WORDS = 1;

/**
 * The growable counterpart of {@link BitSet}: a bit vector with no fixed
 * universe.
 *
 * `BitSet` throws on a member outside its size, which is what a caller wants
 * when the universe is known and a stray index is a bug. This one grows the
 * backing instead, doubling it, so `add` never rejects a non-negative integer.
 * The trade is that `size` is a moving target and a typo silently allocates
 * rather than failing loudly — prefer `BitSet` whenever the bound is known.
 *
 * Growth never shrinks: `delete` and `clear` clear bits but keep the backing,
 * so a vector that once held a large member stays that large. `size` therefore
 * reports the current _capacity_ in bits, not the largest member held.
 *
 * Time complexity: O(1) amortised for `add`, O(1) for `delete` and `has`,
 * O(size / 32) for `count`, `rank` and the set operations.
 *
 * @see BitSet for the fixed-size version, and for the operation semantics.
 */
export class BitVector implements ISet<number> {
	private words: Uint32Array;
	private cardinality = 0;

	constructor(iterable?: Iterable<number>) {
		this.words = new Uint32Array(MIN_WORDS);

		if (iterable) {
			this.addAll(iterable);
		}
	}

	/** The current capacity in bits, which grows and never shrinks. */
	get size(): number {
		return this.words.length * BITS_PER_WORD;
	}

	/** Members in ascending order. */
	*[Symbol.iterator](): Iterator<number> {
		const { words } = this;

		for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
			let word = words[wordIndex]!;

			while (word !== 0) {
				yield (wordIndex << WORD_SHIFT) + ctz32(word);
				word &= word - 1;
			}
		}
	}

	/** O(1). */
	count(): number {
		return this.cardinality;
	}

	/** Clears every bit. Does not release the backing. */
	clear(): void {
		this.words.fill(0);
		this.cardinality = 0;
	}

	/**
	 * O(1) amortised — grows the backing when `member` is beyond it.
	 *
	 * @throws {RangeError} If `member` is negative or not an integer. Unlike the
	 *   upper bound, that can never be a sizing question.
	 */
	add(member: number): void {
		this.requireMember(member);
		this.ensureBit(member);

		const wordIndex = member >>> WORD_SHIFT;
		const mask = 1 << (member & WORD_MASK);

		if ((this.words[wordIndex]! & mask) === 0) {
			this.words[wordIndex]! |= mask;
			this.cardinality++;
		}
	}

	/** O(m), growing at most once per distinct backing size. */
	addAll(members: Iterable<number>): void {
		for (const member of members) {
			this.add(member);
		}
	}

	/** O(1). A member beyond the current capacity was never present. */
	delete(member: number): boolean {
		this.requireMember(member);

		if (member >= this.size) {
			return false;
		}

		const wordIndex = member >>> WORD_SHIFT;
		const mask = 1 << (member & WORD_MASK);

		if ((this.words[wordIndex]! & mask) === 0) {
			return false;
		}

		this.words[wordIndex]! &= ~mask;
		this.cardinality--;

		return true;
	}

	/** O(1). Out of range is a miss, not an error — a query never throws. */
	has(member: number): boolean {
		if (!Number.isInteger(member) || member < 0 || member >= this.size) {
			return false;
		}

		return (
			(this.words[member >>> WORD_SHIFT]! & (1 << (member & WORD_MASK))) !== 0
		);
	}

	/** How many members are strictly below `upperBound`. O(size / 32). */
	rank(upperBound: number): number {
		return this.snapshot().rank(upperBound);
	}

	/** O(size / 32). Returns a `BitVector`, so the result grows too. */
	union(other: Iterable<number>): BitVector {
		const result = new BitVector(this);
		result.addAll(other);
		return result;
	}

	/** O(size / 32). */
	intersection(other: Iterable<number>): BitVector {
		return BitVector.from(this.snapshot().intersection(this.coerce(other)));
	}

	/** O(size / 32). */
	difference(other: Iterable<number>): BitVector {
		return BitVector.from(this.snapshot().difference(this.coerce(other)));
	}

	/** O(size / 32). */
	symmetricDifference(other: Iterable<number>): BitVector {
		return BitVector.from(
			this.snapshot().symmetricDifference(this.coerce(other)),
		);
	}

	/** O(size / 32). */
	isSubsetOf(other: Iterable<number>): boolean {
		return this.snapshot().isSubsetOf(this.coerce(other));
	}

	/** O(size / 32). */
	isSupersetOf(other: Iterable<number>): boolean {
		for (const member of other) {
			if (!this.has(member)) {
				return false;
			}
		}

		return true;
	}

	/** O(size / 32). */
	isDisjointFrom(other: Iterable<number>): boolean {
		for (const member of other) {
			if (this.has(member)) {
				return false;
			}
		}

		return true;
	}

	private static from(members: Iterable<number>): BitVector {
		return new BitVector(members);
	}

	/** A fixed-size view of the current contents, for the word-at-a-time paths. */
	private snapshot(): BitSet {
		return new BitSet(this, { size: Math.max(this.size, 1) });
	}

	private coerce(other: Iterable<number>): BitSet {
		return other instanceof BitSet ? other : new BitSet(Array.from(other));
	}

	private ensureBit(member: number): void {
		const requiredWords = (member >>> WORD_SHIFT) + 1;

		if (requiredWords <= this.words.length) {
			return;
		}

		const grown = new Uint32Array(
			Math.max(this.words.length * 2, requiredWords),
		);

		grown.set(this.words, 0);
		this.words = grown;
	}

	private requireMember(member: number): void {
		if (!Number.isInteger(member) || member < 0) {
			throw new RangeError(
				`Member must be a non-negative integer, got ${member}`,
			);
		}
	}
}
