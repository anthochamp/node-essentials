import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { words } from "@ac-bench/util";
import { MultiMap, MultiSet, StaticDisjointSet, Trie } from "@ac-kit/data";
import {
	MultiMap as MnemonistMultiMap,
	MultiSet as MnemonistMultiSet,
	Trie as MnemonistTrie,
} from "mnemonist";

const WORDS = words(20_000);
const DISTINCT_WORDS = Array.from(new Set(WORDS));
const CHARS = DISTINCT_WORDS.map((word) => Array.from(word));

durationCondition(
	`Trie — index ${DISTINCT_WORDS.length} words, then look each up`,
	() => {
		durationCase(
			"@ac-kit/data Trie",
			{ tags: { kind: "js", backing: "map per node" } },
			() => {
				const trie = new Trie<string, number>();

				for (let index = 0; index < CHARS.length; index++) {
					trie.set(CHARS[index]!, index);
				}

				let hits = 0;
				for (let index = 0; index < CHARS.length; index++) {
					if (trie.has(CHARS[index]!)) hits++;
				}

				assert.strictEqual(hits, CHARS.length);
			},
		);
		durationCase(
			"mnemonist Trie (npm)",
			{ tags: { kind: "js", backing: "object per node" } },
			() => {
				const trie = new MnemonistTrie<string>();

				for (let index = 0; index < DISTINCT_WORDS.length; index++) {
					trie.add(DISTINCT_WORDS[index]!);
				}

				let hits = 0;
				for (let index = 0; index < DISTINCT_WORDS.length; index++) {
					if (trie.has(DISTINCT_WORDS[index]!)) hits++;
				}

				assert.strictEqual(hits, DISTINCT_WORDS.length);
			},
		);
		durationCase(
			"Map<string, number> (no prefix queries)",
			{ tags: { kind: "js", backing: "hash" } },
			() => {
				// Cannot answer `withPrefix`/`longestPrefixOf` at all. Here to show
				// what the prefix capability costs against a plain hash lookup.
				const map = new Map<string, number>();

				for (let index = 0; index < DISTINCT_WORDS.length; index++) {
					map.set(DISTINCT_WORDS[index]!, index);
				}

				let hits = 0;
				for (let index = 0; index < DISTINCT_WORDS.length; index++) {
					if (map.has(DISTINCT_WORDS[index]!)) hits++;
				}

				assert.strictEqual(hits, DISTINCT_WORDS.length);
			},
		);
	},
);

const KEYS = WORDS.map((word) => word.slice(0, 2));
const WANTED_ENTRIES = WORDS.length;

durationCondition(`Multimap — ${WORDS.length} (key, value) additions`, () => {
	durationCase(
		"@ac-kit/data MultiMap",
		{ tags: { kind: "js", backing: "map of arrays" } },
		() => {
			const map = new MultiMap<string, string>();

			for (let index = 0; index < WORDS.length; index++) {
				map.add(KEYS[index]!, WORDS[index]!);
			}

			assert.strictEqual(map.count(), WANTED_ENTRIES);
		},
	);
	durationCase(
		"mnemonist MultiMap (npm)",
		{ tags: { kind: "js", backing: "map of arrays" } },
		() => {
			const map = new MnemonistMultiMap<string, string>();

			for (let index = 0; index < WORDS.length; index++) {
				map.set(KEYS[index]!, WORDS[index]!);
			}

			assert.strictEqual(map.size, WANTED_ENTRIES);
		},
	);
	durationCase(
		"Map<string, string[]>",
		{ tags: { kind: "js", backing: "map of arrays" } },
		() => {
			const map = new Map<string, string[]>();
			let entries = 0;

			for (let index = 0; index < WORDS.length; index++) {
				const key = KEYS[index]!;
				let bucket = map.get(key);

				if (bucket === undefined) {
					bucket = [];
					map.set(key, bucket);
				}

				bucket.push(WORDS[index]!);
				entries++;
			}

			assert.strictEqual(entries, WANTED_ENTRIES);
		},
	);
});

durationCondition(
	`Multiset — ${WORDS.length} additions then ${DISTINCT_WORDS.length} multiplicity reads`,
	() => {
		durationCase(
			"@ac-kit/data MultiSet",
			{ tags: { kind: "js", backing: "map of counts" } },
			() => {
				const bag = new MultiSet<string>();

				for (let index = 0; index < WORDS.length; index++) {
					bag.add(WORDS[index]!);
				}

				let total = 0;
				for (let index = 0; index < DISTINCT_WORDS.length; index++) {
					total += bag.multiplicity(DISTINCT_WORDS[index]!);
				}

				assert.strictEqual(total, WORDS.length);
			},
		);
		durationCase(
			"mnemonist MultiSet (npm)",
			{ tags: { kind: "js", backing: "map of counts" } },
			() => {
				const bag = new MnemonistMultiSet<string>();

				for (let index = 0; index < WORDS.length; index++) {
					bag.add(WORDS[index]!);
				}

				let total = 0;
				for (let index = 0; index < DISTINCT_WORDS.length; index++) {
					total += bag.multiplicity(DISTINCT_WORDS[index]!);
				}

				assert.strictEqual(total, WORDS.length);
			},
		);
		durationCase(
			"Map<string, number>",
			{ tags: { kind: "js", backing: "map of counts" } },
			() => {
				const counts = new Map<string, number>();

				for (let index = 0; index < WORDS.length; index++) {
					const word = WORDS[index]!;
					counts.set(word, (counts.get(word) ?? 0) + 1);
				}

				let total = 0;
				for (let index = 0; index < DISTINCT_WORDS.length; index++) {
					total += counts.get(DISTINCT_WORDS[index]!) ?? 0;
				}

				assert.strictEqual(total, WORDS.length);
			},
		);
	},
);

const UNION_PAIRS = 20_000;
const ELEMENTS = 5_000;

durationCondition(
	`Union-find — ${UNION_PAIRS} unions over ${ELEMENTS} elements, then count the components`,
	() => {
		const pairs = Array.from({ length: UNION_PAIRS }, (_, index) => [
			(index * 7919) % ELEMENTS,
			(index * 104_729) % ELEMENTS,
		]);

		durationCase(
			"@ac-kit/data StaticDisjointSet",
			{ tags: { kind: "js", backing: "path compression + rank" } },
			() => {
				const partition = new StaticDisjointSet<number>();

				for (let index = 0; index < pairs.length; index++) {
					const [a, b] = pairs[index] as [number, number];
					partition.union(a, b);
				}

				assert.ok(partition.setCount() >= 1);
			},
		);
		durationCase(
			"array parent + path halving",
			{ tags: { kind: "js", backing: "int32 array" } },
			() => {
				// The textbook version someone writes inline rather than reaching for a
				// package: dense integer ids, no `Map` indirection. It is the ceiling
				// this structure is aiming at, and it only works for integer elements.
				const parent = new Int32Array(ELEMENTS);
				for (let index = 0; index < ELEMENTS; index++) parent[index] = index;

				const find = (start: number): number => {
					let node = start;
					while (parent[node] !== node) {
						parent[node] = parent[parent[node]!]!;
						node = parent[node]!;
					}
					return node;
				};

				let components = ELEMENTS;
				for (let index = 0; index < pairs.length; index++) {
					const [a, b] = pairs[index] as [number, number];
					const rootA = find(a);
					const rootB = find(b);

					if (rootA !== rootB) {
						parent[rootB] = rootA;
						components--;
					}
				}

				assert.ok(components >= 1);
			},
		);
	},
);
