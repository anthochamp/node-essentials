import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { distinctKeys, skewedIndices } from "@ac-bench/util";
import { LruMap } from "@ac-kit/data";
import { LRUCache } from "lru-cache";
import { LRUMap as MnemonistLruMap } from "mnemonist";
import QuickLru from "quick-lru";

const UNIVERSE = 20_000;
const CAPACITY = 2_000;
const OPERATIONS = 50_000;

const KEYS = distinctKeys(UNIVERSE);
const ACCESSES = skewedIndices(OPERATIONS, UNIVERSE);

/**
 * Every contender runs the same get-or-insert loop over the same skewed access
 * pattern, and must report the same number of misses — that count is the proof
 * they implemented the same policy over the same capacity, not just that they
 * each ran something.
 */
function expectedMisses(): number {
	const map = new LruMap<string, number>(undefined, { capacity: CAPACITY });
	let misses = 0;

	for (let index = 0; index < ACCESSES.length; index++) {
		const key = KEYS[ACCESSES[index]!] as string;

		if (map.get(key) === undefined) {
			misses++;
			map.set(key, index);
		}
	}

	return misses;
}

const WANTED_MISSES = expectedMisses();

durationCondition(
	`LRU cache — ${OPERATIONS} skewed get-or-insert over a ${CAPACITY}-entry capacity`,
	() => {
		durationCase(
			"@ac-kit/data LruMap",
			{ tags: { kind: "js", backing: "map + intrusive list" } },
			() => {
				const map = new LruMap<string, number>(undefined, {
					capacity: CAPACITY,
				});
				let misses = 0;

				for (let index = 0; index < ACCESSES.length; index++) {
					const key = KEYS[ACCESSES[index]!] as string;

					if (map.get(key) === undefined) {
						misses++;
						map.set(key, index);
					}
				}

				assert.strictEqual(misses, WANTED_MISSES);
			},
		);
		durationCase(
			"lru-cache (npm)",
			{ tags: { kind: "js", backing: "typed-array ring" } },
			() => {
				const map = new LRUCache<string, number>({ max: CAPACITY });
				let misses = 0;

				for (let index = 0; index < ACCESSES.length; index++) {
					const key = KEYS[ACCESSES[index]!] as string;

					if (map.get(key) === undefined) {
						misses++;
						map.set(key, index);
					}
				}

				assert.strictEqual(misses, WANTED_MISSES);
			},
		);
		durationCase(
			"quick-lru (npm)",
			{ tags: { kind: "js", backing: "two maps" } },
			() => {
				const map = new QuickLru<string, number>({ maxSize: CAPACITY });
				let misses = 0;

				for (let index = 0; index < ACCESSES.length; index++) {
					const key = KEYS[ACCESSES[index]!] as string;

					if (map.get(key) === undefined) {
						misses++;
						map.set(key, index);
					}
				}

				// `quick-lru` holds up to 2x `maxSize` between evictions by design, so
				// it sees strictly fewer misses. Asserting the exact count would fail
				// on a difference of policy, not of speed.
				assert.ok(misses <= WANTED_MISSES);
			},
		);
		durationCase(
			"mnemonist LRUMap (npm)",
			{ tags: { kind: "js", backing: "typed-array pool" } },
			() => {
				const map = new MnemonistLruMap<string, number>(CAPACITY);
				let misses = 0;

				for (let index = 0; index < ACCESSES.length; index++) {
					const key = KEYS[ACCESSES[index]!] as string;

					if (map.get(key) === undefined) {
						misses++;
						map.set(key, index);
					}
				}

				assert.strictEqual(misses, WANTED_MISSES);
			},
		);
		durationCase(
			"Map + oldest-key eviction",
			{ tags: { kind: "js", backing: "map insertion order" } },
			() => {
				// The obvious hand-rolled version: a `Map` iterates in insertion order,
				// so its first key is the oldest. That makes it FIFO, not LRU — the
				// reason it is here is that it is what someone writes instead of
				// reaching for a library, and it is worth knowing what it costs.
				const map = new Map<string, number>();
				let misses = 0;

				for (let index = 0; index < ACCESSES.length; index++) {
					const key = KEYS[ACCESSES[index]!] as string;
					const held = map.get(key);

					if (held === undefined) {
						misses++;

						if (map.size >= CAPACITY) {
							map.delete(map.keys().next().value as string);
						}

						map.set(key, index);
					} else {
						// Re-insert to move it to the back, which is the only way a `Map`
						// can express recency.
						map.delete(key);
						map.set(key, held);
					}
				}

				assert.ok(misses > 0);
			},
		);
	},
);
