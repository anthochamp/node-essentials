import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { randomInts, words } from "@ac-bench/util";
import {
	EnhancedSet,
	FuzzyMap,
	StaticIntervalTree,
	TypedVector,
} from "@ac-kit/data";
import { Float64Vector } from "mnemonist";

const INTERVAL_COUNT = 5_000;
const STABS = 2_000;

const STARTS = randomInts(INTERVAL_COUNT, 10_000, 0x3333_3333);
const SPANS = randomInts(INTERVAL_COUNT, 200, 0x4444_4444);
const INTERVALS = STARTS.map((from, index) => ({
	from,
	to: from + SPANS[index]! + 1,
	value: index,
}));
const POINTS = randomInts(STABS, 10_000, 0x5555_5555);

const WANTED_STAB_TOTAL = POINTS.reduce(
	(total, point) =>
		total +
		INTERVALS.filter((item) => item.from <= point && point < item.to).length,
	0,
);

durationCondition(
	`Interval index — ${STABS} stabbing queries over ${INTERVAL_COUNT} intervals`,
	() => {
		durationCase(
			"@ac-kit/data StaticIntervalTree",
			{ tags: { kind: "js", backing: "centered interval tree" } },
			() => {
				const tree = new StaticIntervalTree(INTERVALS);
				let total = 0;

				for (let index = 0; index < POINTS.length; index++) {
					for (const _ of tree.stab(POINTS[index]!)) total++;
				}

				assert.strictEqual(total, WANTED_STAB_TOTAL);
			},
		);
		durationCase(
			"scan every interval",
			{ tags: { kind: "js", backing: "array" } },
			() => {
				// O(n) per query. The tree has to beat this to be worth building, and
				// at this interval count it should by a wide margin.
				let total = 0;

				for (let index = 0; index < POINTS.length; index++) {
					const point = POINTS[index]!;

					for (let item = 0; item < INTERVALS.length; item++) {
						const interval = INTERVALS[item]!;
						if (interval.from <= point && point < interval.to) total++;
					}
				}

				assert.strictEqual(total, WANTED_STAB_TOTAL);
			},
		);
	},
);

const APPENDS = 100_000;

durationCondition(`Numeric vector — append ${APPENDS} floats`, () => {
	durationCase(
		"@ac-kit/data TypedVector(Float64Array)",
		{ tags: { kind: "js", backing: "float64 array" } },
		() => {
			const vector = new TypedVector(Float64Array);
			for (let index = 0; index < APPENDS; index++) vector.pushBack(index);
			assert.strictEqual(vector.count(), APPENDS);
		},
	);
	durationCase(
		"mnemonist Float64Vector (npm)",
		{ tags: { kind: "js", backing: "float64 array" } },
		() => {
			const vector = new Float64Vector(8);
			for (let index = 0; index < APPENDS; index++) vector.push(index);
			// `.length`, not `.size`: mnemonist's `.d.ts` declares `size` but the
			// runtime only has `length`, so the declared one reads `undefined`.
			assert.strictEqual(
				(vector as unknown as { length: number }).length,
				APPENDS,
			);
		},
	);
	durationCase(
		"number[] push",
		{ tags: { kind: "js", backing: "array" } },
		() => {
			// Boxes nothing in practice — V8 keeps a packed double array — so this is
			// the bar a typed vector has to justify itself against on speed. What it
			// cannot match is the memory footprint.
			const values: number[] = [];
			for (let index = 0; index < APPENDS; index++) values.push(index);
			assert.strictEqual(values.length, APPENDS);
		},
	);
	durationCase(
		"manual Float64Array doubling",
		{ tags: { kind: "js", backing: "float64 array" } },
		() => {
			let data = new Float64Array(8);
			let size = 0;

			for (let index = 0; index < APPENDS; index++) {
				if (size === data.length) {
					const grown = new Float64Array(data.length * 2);
					grown.set(data, 0);
					data = grown;
				}
				data[size++] = index;
			}

			assert.strictEqual(size, APPENDS);
		},
	);
});

const KEY_COUNT = 20_000;
const RAW_KEYS = words(KEY_COUNT);
const MIXED_CASE = RAW_KEYS.map((key, index) =>
	index % 2 === 0 ? key.toUpperCase() : key,
);
const WANTED_DISTINCT = new Set(RAW_KEYS.map((key) => key.toLowerCase())).size;

durationCondition(
	`Case-insensitive map — ${KEY_COUNT} inserts then ${KEY_COUNT} lookups`,
	() => {
		durationCase(
			"@ac-kit/data FuzzyMap",
			{ tags: { kind: "js", backing: "map + normaliser" } },
			() => {
				const map = new FuzzyMap<string, number>(undefined, {
					normalize: (key) => key.toLowerCase(),
				});

				for (let index = 0; index < MIXED_CASE.length; index++) {
					map.set(MIXED_CASE[index]!, index);
				}

				let hits = 0;
				for (let index = 0; index < MIXED_CASE.length; index++) {
					if (map.get(MIXED_CASE[index]!) !== undefined) hits++;
				}

				assert.strictEqual(map.count(), WANTED_DISTINCT);
				assert.strictEqual(hits, MIXED_CASE.length);
			},
		);
		durationCase(
			"Map + lowercase at every call site",
			{ tags: { kind: "js", backing: "hash" } },
			() => {
				// What this replaces: the normalisation moves to every call site, where
				// it is one forgotten `.toLowerCase()` away from a silent miss.
				const map = new Map<string, number>();

				for (let index = 0; index < MIXED_CASE.length; index++) {
					map.set(MIXED_CASE[index]!.toLowerCase(), index);
				}

				let hits = 0;
				for (let index = 0; index < MIXED_CASE.length; index++) {
					if (map.get(MIXED_CASE[index]!.toLowerCase()) !== undefined) hits++;
				}

				assert.strictEqual(map.size, WANTED_DISTINCT);
				assert.strictEqual(hits, MIXED_CASE.length);
			},
		);
	},
);

const SET_SIZE = 2_000;
const SET_ITEMS = randomInts(SET_SIZE, SET_SIZE * 4, 0x6666_6666);
const SET_PROBES = randomInts(SET_SIZE, SET_SIZE * 4, 0x7777_7777);
const SET_REFERENCE = new Set(SET_ITEMS);
const WANTED_SET_HITS = SET_PROBES.reduce(
	(total, probe) => total + (SET_REFERENCE.has(probe) ? 1 : 0),
	0,
);

durationCondition(
	`Custom-equality set — ${SET_SIZE} inserts then ${SET_SIZE} membership tests`,
	() => {
		durationCase(
			"@ac-kit/data EnhancedSet",
			{ tags: { kind: "js", backing: "array + comparator" } },
			() => {
				// Linear by construction: an arbitrary equality cannot be hashed. The
				// gap against `Set` below is the price of that generality, and it is
				// why the class documents O(n) membership.
				const set = new EnhancedSet<number>(SET_ITEMS);
				let hits = 0;

				for (let index = 0; index < SET_PROBES.length; index++) {
					if (set.has(SET_PROBES[index]!)) hits++;
				}

				assert.strictEqual(hits, WANTED_SET_HITS);
			},
		);
		durationCase(
			"Set<number> (SameValueZero only)",
			{ tags: { kind: "js", backing: "hash" } },
			() => {
				const set = new Set(SET_ITEMS);
				let hits = 0;

				for (let index = 0; index < SET_PROBES.length; index++) {
					if (set.has(SET_PROBES[index]!)) hits++;
				}

				assert.strictEqual(hits, WANTED_SET_HITS);
			},
		);
		durationCase(
			"array + indexOf",
			{ tags: { kind: "js", backing: "array" } },
			() => {
				// The same complexity as `EnhancedSet`, but with a native scan instead
				// of a comparator call per element — the ceiling for a linear set.
				const items: number[] = [];

				for (let index = 0; index < SET_ITEMS.length; index++) {
					if (!items.includes(SET_ITEMS[index]!)) items.push(SET_ITEMS[index]!);
				}

				let hits = 0;
				for (let index = 0; index < SET_PROBES.length; index++) {
					if (items.includes(SET_PROBES[index]!)) hits++;
				}

				assert.strictEqual(hits, WANTED_SET_HITS);
			},
		);
	},
);
