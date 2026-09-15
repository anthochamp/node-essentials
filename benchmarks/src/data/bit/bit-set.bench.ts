import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { randomInts } from "@ac-bench/util";
import { BitSet, BitVector } from "@ac-kit/data";
import { BitSet as MnemonistBitSet } from "mnemonist";
import { TypedFastBitSet } from "typedfastbitset";

const UNIVERSE = 100_000;
const MEMBERS = randomInts(20_000, UNIVERSE);
const QUERIES = randomInts(50_000, UNIVERSE, 0x1234_5678);

const reference = new Set(MEMBERS);
const WANTED_HITS = QUERIES.reduce(
	(total, query) => total + (reference.has(query) ? 1 : 0),
	0,
);

durationCondition(
	`Bit set — add ${MEMBERS.length} members then ${QUERIES.length} membership tests over a ${UNIVERSE}-bit universe`,
	() => {
		durationCase(
			"@ac-kit/data BitSet",
			{ tags: { kind: "js", backing: "uint32 words" } },
			() => {
				const set = new BitSet(undefined, { size: UNIVERSE });
				for (let index = 0; index < MEMBERS.length; index++) {
					set.add(MEMBERS[index]!);
				}

				let hits = 0;
				for (let index = 0; index < QUERIES.length; index++) {
					if (set.has(QUERIES[index]!)) hits++;
				}

				assert.strictEqual(hits, WANTED_HITS);
			},
		);
		durationCase(
			"@ac-kit/data BitVector",
			{ tags: { kind: "js", backing: "growable uint32 words" } },
			() => {
				const set = new BitVector();
				for (let index = 0; index < MEMBERS.length; index++) {
					set.add(MEMBERS[index]!);
				}

				let hits = 0;
				for (let index = 0; index < QUERIES.length; index++) {
					if (set.has(QUERIES[index]!)) hits++;
				}

				assert.strictEqual(hits, WANTED_HITS);
			},
		);
		durationCase(
			"typedfastbitset (npm)",
			{ tags: { kind: "js", backing: "growable uint32 words" } },
			() => {
				const set = new TypedFastBitSet();
				for (let index = 0; index < MEMBERS.length; index++) {
					set.add(MEMBERS[index]!);
				}

				let hits = 0;
				for (let index = 0; index < QUERIES.length; index++) {
					if (set.has(QUERIES[index]!)) hits++;
				}

				assert.strictEqual(hits, WANTED_HITS);
			},
		);
		durationCase(
			"mnemonist BitSet (npm)",
			{ tags: { kind: "js", backing: "uint32 words" } },
			() => {
				const set = new MnemonistBitSet(UNIVERSE);
				for (let index = 0; index < MEMBERS.length; index++) {
					set.set(MEMBERS[index]!);
				}

				let hits = 0;
				for (let index = 0; index < QUERIES.length; index++) {
					if (set.test(QUERIES[index]!)) hits++;
				}

				assert.strictEqual(hits, WANTED_HITS);
			},
		);
		durationCase(
			"Set<number>",
			{ tags: { kind: "js", backing: "hash" } },
			() => {
				const set = new Set<number>();
				for (let index = 0; index < MEMBERS.length; index++) {
					set.add(MEMBERS[index]!);
				}

				let hits = 0;
				for (let index = 0; index < QUERIES.length; index++) {
					if (set.has(QUERIES[index]!)) hits++;
				}

				assert.strictEqual(hits, WANTED_HITS);
			},
		);
	},
);

durationCondition(
	`Bit set — union and intersection of two ${UNIVERSE}-bit sets`,
	() => {
		const OTHER = randomInts(20_000, UNIVERSE, 0xdead_beef);

		const left = new Set(MEMBERS);
		const right = new Set(OTHER);
		let wantedUnion = 0;
		for (const value of new Set([...left, ...right])) {
			wantedUnion += value >= 0 ? 1 : 0;
		}

		durationCase(
			"@ac-kit/data BitSet",
			{ tags: { kind: "js", backing: "uint32 words" } },
			() => {
				const a = new BitSet(MEMBERS, { size: UNIVERSE });
				const b = new BitSet(OTHER, { size: UNIVERSE });

				assert.strictEqual(a.union(b).count(), wantedUnion);
				assert.ok(a.intersection(b).count() > 0);
			},
		);
		durationCase(
			"typedfastbitset (npm)",
			{ tags: { kind: "js", backing: "growable uint32 words" } },
			() => {
				const a = new TypedFastBitSet(MEMBERS);
				const b = new TypedFastBitSet(OTHER);

				assert.strictEqual(a.new_union(b).size(), wantedUnion);
				assert.ok(a.new_intersection(b).size() > 0);
			},
		);
		durationCase(
			"Set<number> (native algebra)",
			{ tags: { kind: "js", backing: "hash" } },
			() => {
				const a = new Set(MEMBERS);
				const b = new Set(OTHER);

				assert.strictEqual(a.union(b).size, wantedUnion);
				assert.ok(a.intersection(b).size > 0);
			},
		);
	},
);
