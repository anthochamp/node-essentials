import type { ISubstringIndex } from "./isubstring-index.js";

/**
 * A substring index over one string: every suffix, sorted.
 *
 * Answers "where does this substring occur" in O(m log n) for a needle of
 * length `m`, against the O(n·m) a scan would cost — so it pays for itself as
 * soon as one text is searched more than a few times. Construction is O(n log²
 * n) and the index is **static**: to search different text, build another.
 *
 * The array holds the starting offset of each suffix in sorted order, so every
 * occurrence of a needle is a contiguous run, found by two binary searches.
 *
 * Space complexity: O(n) machine words beside the text itself.
 */
export class SuffixArray implements ISubstringIndex<string> {
	private readonly suffixes: Int32Array;

	constructor(readonly text: string) {
		this.suffixes = buildSuffixArray_(text);
	}

	/** The number of suffixes, i.e. the text's length. */
	count(): number {
		return this.suffixes.length;
	}

	/** The starting offsets of every suffix, in sorted order. */
	order(): readonly number[] {
		return Array.from(this.suffixes);
	}

	/**
	 * Every starting offset where `needle` occurs, in ascending order. O(m log n)
	 * to locate, plus O(k log k) to sort the k occurrences.
	 *
	 * An empty needle matches at every offset, `String.prototype.indexOf`'s
	 * convention.
	 */
	*search(needle: string): IterableIterator<number> {
		if (needle.length === 0) {
			for (let index = 0; index < this.text.length; index++) {
				yield index;
			}
			return;
		}

		const start = this.lowerBound(needle);
		const end = this.upperBound(needle);

		const offsets: number[] = [];
		for (let index = start; index < end; index++) {
			offsets.push(this.suffixes[index]!);
		}

		// Suffix-array order is lexicographic, not positional.
		offsets.sort((left, right) => left - right);

		yield* offsets;
	}

	/** O(m log n). */
	has(needle: string): boolean {
		if (needle.length === 0) {
			return true;
		}

		return this.lowerBound(needle) < this.upperBound(needle);
	}

	/** How many times `needle` occurs. O(m log n), without materialising them. */
	countOf(needle: string): number {
		if (needle.length === 0) {
			return this.text.length;
		}

		return this.upperBound(needle) - this.lowerBound(needle);
	}

	/** First index whose suffix is not less than `needle`. */
	private lowerBound(needle: string): number {
		let low = 0;
		let high = this.suffixes.length;

		while (low < high) {
			const middle = (low + high) >>> 1;

			if (this.comparePrefix(this.suffixes[middle]!, needle) < 0) {
				low = middle + 1;
			} else {
				high = middle;
			}
		}

		return low;
	}

	/** First index whose suffix does not start with `needle`. */
	private upperBound(needle: string): number {
		let low = 0;
		let high = this.suffixes.length;

		while (low < high) {
			const middle = (low + high) >>> 1;

			if (this.comparePrefix(this.suffixes[middle]!, needle) <= 0) {
				low = middle + 1;
			} else {
				high = middle;
			}
		}

		return low;
	}

	/**
	 * Orders the suffix at `offset` against `needle`, treating `needle` as a
	 * prefix: `0` means the suffix starts with it.
	 */
	private comparePrefix(offset: number, needle: string): number {
		const { text } = this;
		const available = text.length - offset;
		const limit = Math.min(available, needle.length);

		for (let index = 0; index < limit; index++) {
			const difference =
				text.charCodeAt(offset + index) - needle.charCodeAt(index);

			if (difference !== 0) {
				return difference < 0 ? -1 : 1;
			}
		}

		// The suffix ran out before the needle did, so it is the smaller.
		return available < needle.length ? -1 : 0;
	}
}

/**
 * Builds the suffix array of `text` by prefix doubling: O(n log² n).
 *
 * The naive "sort every suffix as a string" is O(n² log n) because each
 * comparison is itself O(n), which is unusable past a few thousand characters.
 * Prefix doubling sorts by rank pairs instead, so each comparison is O(1) and
 * only log n rounds are needed.
 */
function buildSuffixArray_(text: string): Int32Array {
	const length = text.length;

	if (length === 0) {
		return new Int32Array(0);
	}

	const order = new Int32Array(length);
	const rank = new Int32Array(length);
	const nextRank = new Int32Array(length);

	for (let index = 0; index < length; index++) {
		order[index] = index;
		rank[index] = text.charCodeAt(index);
	}

	for (let span = 1; ; span *= 2) {
		const compare = (left: number, right: number): number => {
			if (rank[left] !== rank[right]) {
				return rank[left]! - rank[right]!;
			}

			// A suffix that runs off the end sorts first: it is a proper prefix of
			// the other, and shorter suffixes precede their extensions.
			const leftNext = left + span < length ? rank[left + span]! : -1;
			const rightNext = right + span < length ? rank[right + span]! : -1;

			return leftNext - rightNext;
		};

		order.sort(compare);

		nextRank[order[0]!] = 0;
		for (let index = 1; index < length; index++) {
			nextRank[order[index]!] =
				nextRank[order[index - 1]!]! +
				(compare(order[index - 1]!, order[index]!) < 0 ? 1 : 0);
		}

		rank.set(nextRank);

		// Every suffix has a distinct rank: nothing further can reorder them.
		if (rank[order[length - 1]!] === length - 1) {
			break;
		}

		if (span >= length) {
			break;
		}
	}

	return order;
}
