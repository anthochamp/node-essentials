import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { distinctKeys, stringHash32 } from "@ac-bench/util";
import { BloomFilter, CuckooFilter } from "@ac-kit/data";
import { BloomFilter as NpmBloomFilter } from "bloom-filters";
import { BloomFilter as MnemonistBloomFilter } from "mnemonist";

// Kept small deliberately: `bloom-filters` is two orders of magnitude slower
// than the others here, and a larger workload trips the runner's per-child
// timeout before it can collect a single sample.
const SIZE = 1_000;
const ERROR_RATE = 0.01;

const PRESENT = distinctKeys(SIZE, "present");
const ABSENT = distinctKeys(SIZE, "absent");

durationCondition(
	`Approximate membership — add ${SIZE} items then probe ${SIZE} present and ${SIZE} absent`,
	() => {
		durationCase(
			"@ac-kit/data BloomFilter",
			{ tags: { kind: "js", backing: "bit array" } },
			() => {
				const filter = new BloomFilter<string>(undefined, {
					hash: stringHash32,
					expectedItems: SIZE,
					falsePositiveRate: ERROR_RATE,
				});

				filter.addAll(PRESENT);

				let hits = 0;
				for (let index = 0; index < PRESENT.length; index++) {
					if (filter.has(PRESENT[index]!)) hits++;
				}
				for (let index = 0; index < ABSENT.length; index++) {
					if (filter.has(ABSENT[index]!)) hits++;
				}

				// No false negatives is the contract; false positives push this a
				// little above SIZE, never below.
				assert.ok(hits >= SIZE);
			},
		);
		durationCase(
			"@ac-kit/data CuckooFilter",
			{ tags: { kind: "js", backing: "fingerprint buckets" } },
			() => {
				const filter = new CuckooFilter<string>(undefined, {
					hash: stringHash32,
					expectedItems: SIZE,
				});

				filter.addAll(PRESENT);

				let hits = 0;
				for (let index = 0; index < PRESENT.length; index++) {
					if (filter.has(PRESENT[index]!)) hits++;
				}
				for (let index = 0; index < ABSENT.length; index++) {
					if (filter.has(ABSENT[index]!)) hits++;
				}

				assert.ok(hits > 0);
			},
		);
		durationCase(
			"bloom-filters (npm)",
			{ tags: { kind: "js", backing: "bit array" } },
			() => {
				const filter = NpmBloomFilter.create(SIZE, ERROR_RATE);

				for (let index = 0; index < PRESENT.length; index++) {
					filter.add(PRESENT[index]!);
				}

				let hits = 0;
				for (let index = 0; index < PRESENT.length; index++) {
					if (filter.has(PRESENT[index]!)) hits++;
				}
				for (let index = 0; index < ABSENT.length; index++) {
					if (filter.has(ABSENT[index]!)) hits++;
				}

				assert.ok(hits >= SIZE);
			},
		);
		durationCase(
			"mnemonist BloomFilter (npm)",
			{ tags: { kind: "js", backing: "bit array" } },
			() => {
				const filter = new MnemonistBloomFilter(SIZE);

				for (let index = 0; index < PRESENT.length; index++) {
					filter.add(PRESENT[index]!);
				}

				let hits = 0;
				for (let index = 0; index < PRESENT.length; index++) {
					if (filter.test(PRESENT[index]!)) hits++;
				}
				for (let index = 0; index < ABSENT.length; index++) {
					if (filter.test(ABSENT[index]!)) hits++;
				}

				assert.ok(hits >= SIZE);
			},
		);
		durationCase(
			"Set<string> (exact, for scale)",
			{ tags: { kind: "js", backing: "hash" } },
			() => {
				// Exact and therefore not a competitor — it stores every key, which is
				// the cost the filters exist to avoid. Here to show what approximation
				// buys and what it costs in speed.
				const set = new Set<string>();

				for (let index = 0; index < PRESENT.length; index++) {
					set.add(PRESENT[index]!);
				}

				let hits = 0;
				for (let index = 0; index < PRESENT.length; index++) {
					if (set.has(PRESENT[index]!)) hits++;
				}
				for (let index = 0; index < ABSENT.length; index++) {
					if (set.has(ABSENT[index]!)) hits++;
				}

				assert.strictEqual(hits, SIZE);
			},
		);
	},
);
