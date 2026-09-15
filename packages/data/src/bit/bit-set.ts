import { ctz32, popCount32 } from "@ac-kit/core";

import { ISet } from "../set/iset.js";

const BITS_PER_WORD = 32;
const WORD_SHIFT = 5;
const WORD_MASK = BITS_PER_WORD - 1;

export type BitSetOptions = {
	/**
	 * How many bits the set can hold: members are the integers `0 .. size - 1`.
	 *
	 * Omit it and the set is sized to exactly fit the constructor's iterable,
	 * which is what `new BitSet(members)` wants; state it when the universe is
	 * known up front and larger than the initial members. Fixed either way — see
	 * `BitVector` for the growable counterpart.
	 */
	size?: number;
};

/**
 * A fixed-size set of small non-negative integers, one bit per member.
 *
 * Where a `Set<number>` costs a hash entry per member, this costs one bit per
 * _possible_ member — so it wins decisively when the universe is bounded and
 * the set is dense, and loses when a handful of members are drawn from a huge
 * range. The set operations are word-at-a-time, which is what makes them
 * roughly 32× cheaper than the element-at-a-time equivalents.
 *
 * Time complexity: O(1) for `add`, `delete` and `has`. `count`, `rank` and
 * every set operation are O(size / 32). Space complexity: O(size / 8) bytes,
 * independent of how many members are present.
 *
 * Members outside `0 .. size - 1` are a programming error, not a miss: `add`
 * and `delete` throw, so a caller cannot silently lose elements to a mis-sized
 * set.
 */
export class BitSet implements ISet<number> {
	private readonly words: Uint32Array;

	/** Maintained incrementally so `count()` is O(1) on the common path. */
	private cardinality = 0;

	/** The number of bits, i.e. one past the largest member this can hold. */
	readonly size: number;

	constructor(iterable?: Iterable<number>, options?: BitSetOptions) {
		const members = iterable === undefined ? undefined : Array.from(iterable);

		// Omitted `size` means "exactly big enough for what was handed in", so the
		// common `new BitSet(members)` needs no second argument.
		let size = options?.size ?? 0;

		if (options?.size === undefined && members !== undefined) {
			for (let index = 0; index < members.length; index++) {
				size = Math.max(size, members[index]! + 1);
			}
		}

		if (!Number.isInteger(size) || size < 0) {
			throw new RangeError(`Size must be a non-negative integer, got ${size}`);
		}

		this.size = size;
		this.words = new Uint32Array((size + WORD_MASK) >>> WORD_SHIFT);

		if (members !== undefined) {
			for (let index = 0; index < members.length; index++) {
				this.add(members[index]!);
			}
		}
	}

	/** Members in ascending order. */
	*[Symbol.iterator](): Iterator<number> {
		const { words } = this;

		for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
			let word = words[wordIndex]!;

			// Clear the lowest set bit each round, so this costs one iteration per
			// member rather than one per bit.
			while (word !== 0) {
				yield (wordIndex << WORD_SHIFT) + ctz32(word);
				word &= word - 1;
			}
		}
	}

	/** The number of members. O(1). */
	count(): number {
		return this.cardinality;
	}

	clear(): void {
		this.words.fill(0);
		this.cardinality = 0;
	}

	/**
	 * O(1).
	 *
	 * @throws {RangeError} If `member` is outside `0 .. size - 1`.
	 */
	add(member: number): void {
		this.requireMember(member);

		const wordIndex = member >>> WORD_SHIFT;
		const mask = 1 << (member & WORD_MASK);

		if ((this.words[wordIndex]! & mask) === 0) {
			this.words[wordIndex]! |= mask;
			this.cardinality++;
		}
	}

	/** O(m) in the number of members added. */
	addAll(members: Iterable<number>): void {
		for (const member of members) {
			this.add(member);
		}
	}

	/**
	 * O(1).
	 *
	 * @throws {RangeError} If `member` is outside `0 .. size - 1`.
	 */
	delete(member: number): boolean {
		this.requireMember(member);

		const wordIndex = member >>> WORD_SHIFT;
		const mask = 1 << (member & WORD_MASK);

		if ((this.words[wordIndex]! & mask) === 0) {
			return false;
		}

		this.words[wordIndex]! &= ~mask;
		this.cardinality--;

		return true;
	}

	/** O(1). Out-of-range is a miss, not an error — a query never throws. */
	has(member: number): boolean {
		if (!Number.isInteger(member) || member < 0 || member >= this.size) {
			return false;
		}

		return (
			(this.words[member >>> WORD_SHIFT]! & (1 << (member & WORD_MASK))) !== 0
		);
	}

	/**
	 * How many members are strictly below `upperBound`. O(size / 32).
	 *
	 * The companion of `count()`: `rank(size)` is `count()`. Together with `has`,
	 * this is what makes a bit set usable as a succinct index.
	 */
	rank(upperBound: number): number {
		const bound = Math.max(0, Math.min(upperBound, this.size));
		const fullWords = bound >>> WORD_SHIFT;

		let total = 0;
		for (let wordIndex = 0; wordIndex < fullWords; wordIndex++) {
			total += popCount32(this.words[wordIndex]!);
		}

		const remainder = bound & WORD_MASK;
		if (remainder !== 0) {
			total += popCount32(this.words[fullWords]! & ((1 << remainder) - 1));
		}

		return total;
	}

	/** O(size / 32). The result is sized to hold both operands' universes. */
	union(other: Iterable<number>): BitSet {
		return this.combine(other, (a, b) => a | b);
	}

	/** O(size / 32). */
	intersection(other: Iterable<number>): BitSet {
		return this.combine(other, (a, b) => a & b);
	}

	/** O(size / 32). */
	difference(other: Iterable<number>): BitSet {
		return this.combine(other, (a, b) => a & ~b);
	}

	/** O(size / 32). */
	symmetricDifference(other: Iterable<number>): BitSet {
		return this.combine(other, (a, b) => a ^ b);
	}

	/** O(size / 32). */
	isSubsetOf(other: Iterable<number>): boolean {
		const right = this.coerce(other);

		for (let wordIndex = 0; wordIndex < this.words.length; wordIndex++) {
			const word = this.words[wordIndex]!;

			if ((word & ~(right.words[wordIndex] ?? 0)) !== 0) {
				return false;
			}
		}

		return true;
	}

	/** O(size / 32). */
	isSupersetOf(other: Iterable<number>): boolean {
		return this.coerce(other).isSubsetOf(this);
	}

	/** O(size / 32). */
	isDisjointFrom(other: Iterable<number>): boolean {
		const right = this.coerce(other);
		const shared = Math.min(this.words.length, right.words.length);

		for (let wordIndex = 0; wordIndex < shared; wordIndex++) {
			if ((this.words[wordIndex]! & right.words[wordIndex]!) !== 0) {
				return false;
			}
		}

		return true;
	}

	private combine(
		other: Iterable<number>,
		operate: (a: number, b: number) => number,
	): BitSet {
		const right = this.coerce(other);
		const result = new BitSet(undefined, {
			size: Math.max(this.size, right.size),
		});

		let cardinality = 0;
		for (let wordIndex = 0; wordIndex < result.words.length; wordIndex++) {
			const word = operate(
				this.words[wordIndex] ?? 0,
				right.words[wordIndex] ?? 0,
			);

			result.words[wordIndex] = word;
			cardinality += popCount32(word);
		}

		result.cardinality = cardinality;

		return result;
	}

	/** Materialises a non-`BitSet` operand so the word-at-a-time paths apply. */
	private coerce(other: Iterable<number>): BitSet {
		if (other instanceof BitSet) {
			return other;
		}

		const members = Array.from(other);
		let size = this.size;

		for (let index = 0; index < members.length; index++) {
			size = Math.max(size, members[index]! + 1);
		}

		return new BitSet(members, { size });
	}

	private requireMember(member: number): void {
		if (!Number.isInteger(member) || member < 0 || member >= this.size) {
			throw new RangeError(
				`Member must be an integer in [0, ${this.size}), got ${member}`,
			);
		}
	}
}
