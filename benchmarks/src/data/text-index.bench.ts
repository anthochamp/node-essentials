import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { words } from "@ac-bench/util";
import { InvertedIndex, SuffixArray } from "@ac-kit/data";
import MiniSearch from "minisearch";

const DOCUMENTS = 2_000;
const TERMS_PER_DOCUMENT = 12;
const QUERIES = 500;

const VOCABULARY = Array.from(new Set(words(1_500)));
const CORPUS = Array.from({ length: DOCUMENTS }, (_, docIndex) =>
	Array.from(
		{ length: TERMS_PER_DOCUMENT },
		(_unused, term) =>
			VOCABULARY[(docIndex * 31 + term * 17) % VOCABULARY.length]!,
	),
);
const PROBES = VOCABULARY.slice(0, QUERIES);

/** What a full scan of the corpus would answer, per term. */
const WANTED_HITS = PROBES.map(
	(term) => CORPUS.filter((document) => document.includes(term)).length,
);

durationCondition(
	`Inverted index — index ${DOCUMENTS} documents, then ${QUERIES} single-term lookups`,
	() => {
		durationCase(
			"@ac-kit/data InvertedIndex",
			{ tags: { kind: "js", backing: "posting sets" } },
			() => {
				const index = new InvertedIndex<string, number>();

				for (let docIndex = 0; docIndex < CORPUS.length; docIndex++) {
					index.index(docIndex, CORPUS[docIndex]!);
				}

				for (let probe = 0; probe < PROBES.length; probe++) {
					assert.strictEqual(
						index.countFor(PROBES[probe]!),
						WANTED_HITS[probe],
					);
				}
			},
		);
		durationCase(
			"minisearch (npm)",
			{ tags: { kind: "js", backing: "radix tree" } },
			() => {
				const index = new MiniSearch<{ id: number; text: string }>({
					fields: ["text"],
					// Pre-tokenised corpus: splitting on a space keeps both contenders
					// indexing exactly the same terms.
					tokenize: (text) => text.split(" "),
					processTerm: (term) => term,
				});

				index.addAll(
					CORPUS.map((document, docIndex) => ({
						id: docIndex,
						text: document.join(" "),
					})),
				);

				for (let probe = 0; probe < PROBES.length; probe++) {
					const found = index.search(PROBES[probe]!, { prefix: false });
					assert.strictEqual(found.length, WANTED_HITS[probe]);
				}
			},
		);
		durationCase(
			"scan every document",
			{ tags: { kind: "js", backing: "array" } },
			() => {
				// No index: the thing an inverted index exists to replace.
				for (let probe = 0; probe < PROBES.length; probe++) {
					const term = PROBES[probe]!;
					let hits = 0;

					for (let docIndex = 0; docIndex < CORPUS.length; docIndex++) {
						if (CORPUS[docIndex]!.includes(term)) hits++;
					}

					assert.strictEqual(hits, WANTED_HITS[probe]);
				}
			},
		);
	},
);

const TEXT = words(4_000).join(" ");
const NEEDLES = VOCABULARY.slice(0, 300);
const WANTED_OCCURRENCES = NEEDLES.map((needle) => {
	let count = 0;
	for (
		let at = TEXT.indexOf(needle);
		at !== -1;
		at = TEXT.indexOf(needle, at + 1)
	) {
		count++;
	}
	return count;
});

durationCondition(
	`Substring search — ${NEEDLES.length} needles over a ${TEXT.length}-character text`,
	() => {
		durationCase(
			"@ac-kit/data SuffixArray",
			{ tags: { kind: "js", backing: "suffix array" } },
			() => {
				const index = new SuffixArray(TEXT);

				for (let probe = 0; probe < NEEDLES.length; probe++) {
					assert.strictEqual(
						index.countOf(NEEDLES[probe]!),
						WANTED_OCCURRENCES[probe],
					);
				}
			},
		);
		durationCase(
			"String.indexOf scan",
			{ tags: { kind: "js", backing: "none" } },
			() => {
				// The engine's own substring search, with no index to build. It wins
				// outright unless the same text is searched many times — which is
				// exactly the trade the suffix array is offering.
				for (let probe = 0; probe < NEEDLES.length; probe++) {
					const needle = NEEDLES[probe]!;
					let count = 0;

					for (
						let at = TEXT.indexOf(needle);
						at !== -1;
						at = TEXT.indexOf(needle, at + 1)
					) {
						count++;
					}

					assert.strictEqual(count, WANTED_OCCURRENCES[probe]);
				}
			},
		);
	},
);
