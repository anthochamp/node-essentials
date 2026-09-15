import type { IMultimap } from "./imultimap.js";

/**
 * A token-to-documents index: the structure behind full-text search.
 *
 * An `IMultimap<Token, DocId>` read backwards — instead of "what does this
 * document contain", it answers "which documents contain this". That inversion
 * is what turns a scan over every document into a lookup plus a set
 * intersection.
 *
 * Postings are a `Set` per token, so indexing the same token twice for one
 * document is idempotent and `hasEntry` is O(1). Tokenisation is the caller's
 * job: this indexes whatever tokens it is handed, which keeps stemming,
 * case-folding and language rules out of the data structure.
 *
 * Time complexity: O(1) for `add`, `has` and `hasEntry`; `search` is O(smallest
 * posting list × number of tokens), because it intersects starting from the
 * rarest token; `deleteDocument` is O(tokens indexed).
 *
 * @template Token The token type, usually `string`.
 * @template DocId The document identifier type.
 */
export class InvertedIndex<Token, DocId> implements IMultimap<Token, DocId> {
	private readonly postings = new Map<Token, Set<DocId>>();
	/** The reverse direction, so removing a document does not scan every token. */
	private readonly documents = new Map<DocId, Set<Token>>();

	private size = 0;

	constructor(iterable?: Iterable<readonly [Token, DocId]>) {
		if (iterable) {
			for (const [token, docId] of iterable) {
				this.add(token, docId);
			}
		}
	}

	*[Symbol.iterator](): Iterator<readonly [Token, DocId]> {
		yield* this.entries();
	}

	/** The total number of `(token, document)` postings. O(1). */
	count(): number {
		return this.size;
	}

	clear(): void {
		this.postings.clear();
		this.documents.clear();
		this.size = 0;
	}

	/** The number of distinct tokens indexed. O(1). */
	keyCount(): number {
		return this.postings.size;
	}

	/** The number of distinct documents indexed. O(1). */
	documentCount(): number {
		return this.documents.size;
	}

	/** The documents containing `token`, in first-indexed order. */
	*get(token: Token): IterableIterator<DocId> {
		const posting = this.postings.get(token);

		if (posting !== undefined) {
			yield* posting;
		}
	}

	/** O(1). Idempotent: indexing the same pair twice changes nothing. */
	add(token: Token, docId: DocId): void {
		let posting = this.postings.get(token);

		if (posting === undefined) {
			posting = new Set();
			this.postings.set(token, posting);
		}

		if (posting.has(docId)) {
			return;
		}

		posting.add(docId);
		this.size++;

		let tokens = this.documents.get(docId);

		if (tokens === undefined) {
			tokens = new Set();
			this.documents.set(docId, tokens);
		}

		tokens.add(token);
	}

	/** O(m) in the number of documents. */
	addAll(token: Token, docIds: Iterable<DocId>): void {
		for (const docId of docIds) {
			this.add(token, docId);
		}
	}

	/**
	 * Indexes one document under every one of its tokens — the natural way in.
	 *
	 * O(t) in the number of tokens. Adds to whatever is already indexed for
	 * `docId`; call `deleteDocument` first to re-index from scratch.
	 */
	index(docId: DocId, tokens: Iterable<Token>): void {
		for (const token of tokens) {
			this.add(token, docId);
		}
	}

	/** O(1). Whether any document holds `token`. */
	has(token: Token): boolean {
		return this.postings.has(token);
	}

	/** O(1). */
	hasEntry(token: Token, docId: DocId): boolean {
		return this.postings.get(token)?.has(docId) ?? false;
	}

	/**
	 * Removes `token` and every posting under it. O(p) in the posting list.
	 *
	 * @returns How many postings were removed.
	 */
	delete(token: Token): number {
		const posting = this.postings.get(token);

		if (posting === undefined) {
			return 0;
		}

		for (const docId of posting) {
			this.forgetToken(docId, token);
		}

		this.postings.delete(token);
		this.size -= posting.size;

		return posting.size;
	}

	/** O(1). */
	deleteEntry(token: Token, docId: DocId): boolean {
		const posting = this.postings.get(token);

		if (posting === undefined || !posting.delete(docId)) {
			return false;
		}

		this.size--;
		this.forgetToken(docId, token);

		if (posting.size === 0) {
			this.postings.delete(token);
		}

		return true;
	}

	/**
	 * Removes a document from every posting list it appears in.
	 *
	 * O(t) in the number of tokens that document was indexed under — the reverse
	 * map is carried precisely so this is not a scan of the whole index.
	 *
	 * @returns `true` if the document was indexed.
	 */
	deleteDocument(docId: DocId): boolean {
		const tokens = this.documents.get(docId);

		if (tokens === undefined) {
			return false;
		}

		for (const token of tokens) {
			const posting = this.postings.get(token);

			if (posting?.delete(docId) === true) {
				this.size--;

				if (posting.size === 0) {
					this.postings.delete(token);
				}
			}
		}

		this.documents.delete(docId);

		return true;
	}

	/** O(1). */
	countFor(token: Token): number {
		return this.postings.get(token)?.size ?? 0;
	}

	/** Every indexed token, in first-indexed order. */
	keys(): IterableIterator<Token> {
		return this.postings.keys();
	}

	/** Every indexed document identifier, in first-indexed order. */
	documentIds(): IterableIterator<DocId> {
		return this.documents.keys();
	}

	/** Every `(token, document)` posting, grouped by token. */
	*entries(): IterableIterator<readonly [Token, DocId]> {
		for (const [token, posting] of this.postings) {
			for (const docId of posting) {
				yield [token, docId];
			}
		}
	}

	/**
	 * Documents containing **every** token — a conjunctive query.
	 *
	 * Intersects from the rarest token outwards, so the work is bounded by the
	 * shortest posting list rather than the longest. An empty `tokens` matches
	 * nothing, not everything: "all of no conditions" is not a useful search.
	 */
	*search(tokens: Iterable<Token>): IterableIterator<DocId> {
		const postings: Set<DocId>[] = [];

		for (const token of tokens) {
			const posting = this.postings.get(token);

			// One absent token means the conjunction is empty.
			if (posting === undefined) {
				return;
			}

			postings.push(posting);
		}

		if (postings.length === 0) {
			return;
		}

		postings.sort((left, right) => left.size - right.size);

		const [rarest, ...rest] = postings as [Set<DocId>, ...Set<DocId>[]];

		for (const docId of rarest) {
			if (rest.every((posting) => posting.has(docId))) {
				yield docId;
			}
		}
	}

	/** Documents containing **any** of the tokens — a disjunctive query. */
	*searchAny(tokens: Iterable<Token>): IterableIterator<DocId> {
		const seen = new Set<DocId>();

		for (const token of tokens) {
			const posting = this.postings.get(token);

			if (posting === undefined) {
				continue;
			}

			for (const docId of posting) {
				if (!seen.has(docId)) {
					seen.add(docId);
					yield docId;
				}
			}
		}
	}

	private forgetToken(docId: DocId, token: Token): void {
		const tokens = this.documents.get(docId);

		if (tokens === undefined) {
			return;
		}

		tokens.delete(token);

		if (tokens.size === 0) {
			this.documents.delete(docId);
		}
	}
}
