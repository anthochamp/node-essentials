import { expect, suite, test } from "vitest";

import { VpTree } from "./vp-tree.js";

/** Absolute difference: a metric on the line, easy to verify by hand. */
const absolute = (a: number, b: number): number => Math.abs(a - b);

const tree = (items?: Iterable<number>): VpTree<number> =>
	new VpTree(items, { distance: absolute });

/** The answer a linear scan would give, to check the pruning against. */
const scanNearest = (
	items: readonly number[],
	query: number,
	count: number,
): number[] =>
	items
		.toSorted((a, b) => absolute(a, query) - absolute(b, query))
		.slice(0, count)
		.toSorted((a, b) => a - b);

suite("VpTree", () => {
	test("should find the nearest neighbours, nearest first", () => {
		const index = tree([1, 5, 10, 20, 50]);

		// |11-10| = 1, |11-5| = 6, |11-20| = 9.
		expect(Array.from(index.nearest(11, 2), ([item]) => item)).toEqual([10, 5]);
		expect(Array.from(index.nearest(0, 1), ([item]) => item)).toEqual([1]);
	});

	test("should report the distance alongside each neighbour", () => {
		const index = tree([1, 5, 10]);

		expect(Array.from(index.nearest(6, 2))).toEqual([
			[5, 1],
			[10, 4],
		]);
	});

	test("should return everything it has when asked for more", () => {
		const index = tree([1, 2, 3]);

		expect(Array.from(index.nearest(0, 99))).toHaveLength(3);
	});

	test("should return nothing for a non-positive count or an empty tree", () => {
		expect(Array.from(tree([1]).nearest(0, 0))).toEqual([]);
		expect(Array.from(tree([1]).nearest(0, -1))).toEqual([]);
		expect(Array.from(tree().nearest(0, 5))).toEqual([]);
		expect(Array.from(tree().within(0, 5))).toEqual([]);
	});

	test("should find everything within a radius", () => {
		const index = tree([1, 5, 10, 20, 50]);

		const found = Array.from(index.within(10, 10), ([item]) => item).sort(
			(a, b) => a - b,
		);

		expect(found).toEqual([1, 5, 10, 20]);
	});

	test("should include an exact match at distance zero", () => {
		const index = tree([1, 5, 10]);

		expect(Array.from(index.within(5, 0))).toEqual([[5, 0]]);
	});

	test("should return nothing for a negative radius", () => {
		expect(Array.from(tree([1]).within(1, -1))).toEqual([]);
	});

	test("should rebuild after a deferred add", () => {
		const index = tree([1, 100]);

		// |50-1| = 49, just under |50-100| = 50.
		expect(Array.from(index.nearest(50, 1), ([item]) => item)).toEqual([1]);

		index.add(49);

		expect(index.count()).toBe(3);
		expect(Array.from(index.nearest(50, 1), ([item]) => item)).toEqual([49]);
	});

	test("should rebuild once for a batch add", () => {
		const index = tree();

		index.addAll([10, 20, 30]);

		expect(index.count()).toBe(3);
		expect(Array.from(index.nearest(21, 1), ([item]) => item)).toEqual([20]);
	});

	test("should clear every item", () => {
		const index = tree([1, 2, 3]);

		index.clear();

		expect(index.count()).toBe(0);
		expect(Array.from(index.nearest(1, 1))).toEqual([]);
	});

	test("should keep duplicates, since a metric cannot tell them apart", () => {
		const index = tree([5, 5, 5]);

		expect(index.count()).toBe(3);
		expect(Array.from(index.within(5, 0))).toHaveLength(3);
	});

	suite("against a linear scan", () => {
		/** Deterministic LCG, so a failure reproduces. */
		const sample = (count: number): number[] => {
			let seed = 987_654_321;
			const values: number[] = [];

			for (let index = 0; index < count; index++) {
				seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
				values.push(seed % 10_000);
			}

			return values;
		};

		test("should agree on k-nearest for many queries", () => {
			const items = sample(500);
			const index = tree(items);

			for (let query = 0; query < 10_000; query += 373) {
				for (const count of [1, 3, 10]) {
					const found = Array.from(
						index.nearest(query, count),
						([item]) => item,
					);

					expect(found).toHaveLength(Math.min(count, items.length));

					// Ties make the item set ambiguous; the distances are not.
					const foundDistances = found
						.map((item) => absolute(item, query))
						.toSorted((a, b) => a - b);
					const expectedDistances = scanNearest(items, query, count)
						.map((item) => absolute(item, query))
						.toSorted((a, b) => a - b);

					expect(foundDistances).toEqual(expectedDistances);
				}
			}
		});

		test("should agree on radius search for many queries", () => {
			const items = sample(500);
			const index = tree(items);

			for (let query = 0; query < 10_000; query += 911) {
				for (const radius of [0, 50, 500]) {
					const found = Array.from(
						index.within(query, radius),
						([item]) => item,
					).toSorted((a, b) => a - b);

					const expected = items
						.filter((item) => absolute(item, query) <= radius)
						.toSorted((a, b) => a - b);

					expect(found).toEqual(expected);
				}
			}
		});
	});

	test("should work over a non-numeric metric space", () => {
		// Hamming distance over equal-length strings: no coordinates anywhere.
		const hamming = (a: string, b: string): number => {
			let distance = 0;

			for (let index = 0; index < a.length; index++) {
				if (a[index] !== b[index]) {
					distance++;
				}
			}

			return distance;
		};

		const index = new VpTree(["0000", "1000", "1100", "1111"], {
			distance: hamming,
		});

		expect(Array.from(index.nearest("1110", 1), ([item]) => item)).toEqual([
			"1111",
		]);
		expect(
			Array.from(index.within("0000", 1), ([item]) => item).sort(),
		).toEqual(["0000", "1000"]);
	});
});
