import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { distinctKeys, stringHash32 } from "@ac-bench/util";
import { CountMinSketch, HyperLogLog } from "@ac-kit/data";
import { CountMinSketch as NpmCms, HyperLogLog as NpmHll } from "bloom-filters";

// Kept modest deliberately: the npm sketches are slow enough that a larger
// workload trips the runner's per-child timeout before it can collect samples.
const DISTINCT = 10_000;
const ITEMS = distinctKeys(DISTINCT, "item");

durationCondition(`Cardinality estimate — ${DISTINCT} distinct items`, () => {
	durationCase(
		"@ac-kit/data HyperLogLog",
		{ tags: { kind: "js", backing: "4096 registers" } },
		() => {
			const estimator = new HyperLogLog<string>(undefined, {
				hash: stringHash32,
				precision: 12,
			});

			estimator.addAll(ITEMS);

			const estimate = estimator.count();
			// Three sigma of its own advertised error: this asserts the estimator
			// works, not that the sample landed on its expectation.
			assert.ok(
				Math.abs(estimate - DISTINCT) / DISTINCT < estimator.relativeError * 3,
			);
		},
	);
	durationCase(
		"bloom-filters HyperLogLog (npm)",
		{ tags: { kind: "js", backing: "4096 registers" } },
		() => {
			const estimator = new NpmHll(4096);

			for (let index = 0; index < ITEMS.length; index++) {
				estimator.update(ITEMS[index]!);
			}

			assert.ok(estimator.count() > 0);
		},
	);
	durationCase(
		"Set<string> (exact, for scale)",
		{ tags: { kind: "js", backing: "hash" } },
		() => {
			// Exact, and O(distinct) in memory — which is the whole thing
			// HyperLogLog trades away.
			const set = new Set<string>();

			for (let index = 0; index < ITEMS.length; index++) {
				set.add(ITEMS[index]!);
			}

			assert.strictEqual(set.size, DISTINCT);
		},
	);
});

durationCondition(
	`Frequency estimate — ${DISTINCT} updates then ${DISTINCT} queries`,
	() => {
		durationCase(
			"@ac-kit/data CountMinSketch",
			{ tags: { kind: "js", backing: "counter matrix" } },
			() => {
				const sketch = new CountMinSketch<string>({
					hash: stringHash32,
					epsilon: 0.001,
					delta: 0.001,
				});

				for (let index = 0; index < ITEMS.length; index++) {
					sketch.add(ITEMS[index]!);
				}

				let total = 0;
				for (let index = 0; index < ITEMS.length; index++) {
					total += sketch.estimate(ITEMS[index]!);
				}

				// Never under-counts, so the sum is at least one per item.
				assert.ok(total >= DISTINCT);
			},
		);
		durationCase(
			"bloom-filters CountMinSketch (npm)",
			{ tags: { kind: "js", backing: "counter matrix" } },
			() => {
				const sketch = NpmCms.create(0.001, 0.001);

				for (let index = 0; index < ITEMS.length; index++) {
					sketch.update(ITEMS[index]!);
				}

				let total = 0;
				for (let index = 0; index < ITEMS.length; index++) {
					total += sketch.count(ITEMS[index]!);
				}

				assert.ok(total >= DISTINCT);
			},
		);
		durationCase(
			"Map<string, number> (exact, for scale)",
			{ tags: { kind: "js", backing: "hash" } },
			() => {
				const counts = new Map<string, number>();

				for (let index = 0; index < ITEMS.length; index++) {
					const item = ITEMS[index]!;
					counts.set(item, (counts.get(item) ?? 0) + 1);
				}

				let total = 0;
				for (let index = 0; index < ITEMS.length; index++) {
					total += counts.get(ITEMS[index]!) ?? 0;
				}

				assert.strictEqual(total, DISTINCT);
			},
		);
	},
);
