import type { ISubstringIndex } from "./isubstring-index.js";
import { SuffixArray } from "./suffix-array.js";

/**
 * Joins the documents. `U+0000` cannot appear in the input (the constructor
 * rejects it), so no match can ever span a boundary: a needle free of the
 * separator cannot align across one.
 */
const SEPARATOR = "\u0000";

/** Where a match was found: which document, and at what offset within it. */
export type DocumentMatch = {
	readonly document: number;
	readonly offset: number;
};

/**
 * A substring index over many strings at once.
 *
 * The documents are concatenated with a separator and indexed as one
 * {@link SuffixArray}, so "which documents contain this substring" costs one
 * search rather than one per document — the difference between O(m log N) and
 * O(d · m log n).
 *
 * Static, like `SuffixArray`: the whole corpus is given at construction.
 *
 * @throws {RangeError} If any document contains `U+0000`, which is reserved as
 *   the internal separator.
 */
export class GeneralizedSuffixArray implements ISubstringIndex<string> {
	private readonly index: SuffixArray;
	/** Start offset of each document within the joined text. */
	private readonly starts: number[] = [];
	private readonly lengths: number[] = [];

	constructor(readonly documents: readonly string[]) {
		let cursor = 0;

		for (let position = 0; position < documents.length; position++) {
			const document = documents[position] as string;

			if (document.includes(SEPARATOR)) {
				throw new RangeError(
					`Document ${position} contains U+0000, which is reserved as the internal separator`,
				);
			}

			this.starts.push(cursor);
			this.lengths.push(document.length);
			cursor += document.length + 1;
		}

		this.index = new SuffixArray(documents.join(SEPARATOR));
	}

	/** The number of documents indexed. */
	count(): number {
		return this.documents.length;
	}

	/**
	 * The indices of every document containing `needle`, ascending and
	 * deduplicated.
	 *
	 * Use {@link matches} for the offsets within each document.
	 */
	*search(needle: string): IterableIterator<number> {
		if (this.documents.length === 0) {
			return;
		}

		if (needle.length === 0) {
			for (let position = 0; position < this.documents.length; position++) {
				yield position;
			}
			return;
		}

		const found = new Set<number>();

		for (const offset of this.index.search(needle)) {
			found.add(this.documentAt(offset));
		}

		yield* Array.from(found).sort((left, right) => left - right);
	}

	/** O(m log N). */
	has(needle: string): boolean {
		if (needle.length === 0) {
			return this.documents.length > 0;
		}

		return this.index.has(needle);
	}

	/** Every occurrence, as a document index and an offset within it. */
	*matches(needle: string): IterableIterator<DocumentMatch> {
		if (needle.length === 0) {
			return;
		}

		for (const offset of this.index.search(needle)) {
			const document = this.documentAt(offset);

			yield { document, offset: offset - (this.starts[document] as number) };
		}
	}

	/** Which document a joined-text offset falls in. O(log d). */
	private documentAt(offset: number): number {
		let low = 0;
		let high = this.starts.length - 1;

		while (low < high) {
			const middle = (low + high + 1) >>> 1;

			if (this.starts[middle]! <= offset) {
				low = middle;
			} else {
				high = middle - 1;
			}
		}

		return low;
	}
}
