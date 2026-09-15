import { expect, suite, test } from "vitest";

import {
	compareNaturalAscending,
	compareNaturalDescending,
} from "./compare-natural.js";
import { createChainedComparator } from "./create-chained-comparator.js";
import { createComparator, createComparatorBy } from "./create-comparator.js";
import { createEqualityComparator } from "./create-equality-comparator.js";
import { createLexicographicalComparator } from "./create-lexicographical-comparator.js";
import {
	createNullishFirstComparator,
	createNullishLastComparator,
} from "./create-nullish-comparator.js";
import { createOrderPredicate } from "./create-order-predicate.js";
import { createReversedComparator } from "./create-reversed-comparator.js";
import type { Comparator, OrderPredicate } from "./types.js";

type Row = { name: string; score: number };

const rows: readonly Row[] = [
	{ name: "b", score: 2 },
	{ name: "a", score: 2 },
	{ name: "c", score: 1 },
];

const lessThan: OrderPredicate<number> = (a, b) => a < b;

suite("createComparator", () => {
	test("recovers all three outcomes from an order predicate", () => {
		const compare = createComparator(lessThan);

		expect(compare(1, 2)).toBe(-1);
		expect(compare(2, 1)).toBe(1);
		expect(compare(1, 1)).toBe(0);
	});
});

suite("createOrderPredicate", () => {
	test("is true only when the comparator says a precedes b", () => {
		const precedes = createOrderPredicate(compareNaturalAscending);

		expect(precedes(1, 2)).toBe(true);
		expect(precedes(2, 1)).toBe(false);
		expect(precedes(1, 1)).toBe(false);
	});

	test("round-trips with createComparator", () => {
		const compare = createComparator(
			createOrderPredicate(compareNaturalAscending),
		);

		expect(compare(1, 2)).toBe(-1);
		expect(compare(2, 1)).toBe(1);
		expect(compare(1, 1)).toBe(0);
	});
});

suite("createComparatorBy", () => {
	test("orders by a single derived key", () => {
		const byScore = createComparatorBy((row: Row) => row.score);

		expect(rows.toSorted(byScore).map((row) => row.name)).toEqual([
			"c",
			"b",
			"a",
		]);
	});

	test("breaks ties with later keys, in priority order", () => {
		const byScoreThenName = createComparatorBy(
			(row: Row) => row.score,
			(row: Row) => row.name,
		);

		expect(rows.toSorted(byScoreThenName).map((row) => row.name)).toEqual([
			"c",
			"a",
			"b",
		]);
	});

	test("agrees across the one-, two- and many-key implementations", () => {
		const keyOf = (row: Row) => row.name;
		const one = createComparatorBy(keyOf);
		const two = createComparatorBy(keyOf, keyOf);
		const many = createComparatorBy(keyOf, keyOf, keyOf);

		for (const a of rows) {
			for (const b of rows) {
				expect(two(a, b)).toBe(one(a, b));
				expect(many(a, b)).toBe(one(a, b));
			}
		}
	});
});

suite("createChainedComparator", () => {
	test("returns the single comparator unchanged", () => {
		expect(createChainedComparator(compareNaturalAscending)).toBe(
			compareNaturalAscending,
		);
	});

	test("mixes ascending and descending keys", () => {
		const byScoreThenNameDescending = createChainedComparator(
			createComparatorBy((row: Row) => row.score),
			createReversedComparator(createComparatorBy((row: Row) => row.name)),
		);

		expect(
			rows.toSorted(byScoreThenNameDescending).map((row) => row.name),
		).toEqual(["c", "b", "a"]);
	});

	test("agrees across the one-, two- and many-comparator implementations", () => {
		const byName: Comparator<Row> = createComparatorBy((row: Row) => row.name);
		const two = createChainedComparator(byName, byName);
		const many = createChainedComparator(byName, byName, byName);

		for (const a of rows) {
			for (const b of rows) {
				expect(two(a, b)).toBe(byName(a, b));
				expect(many(a, b)).toBe(byName(a, b));
			}
		}
	});
});

suite("createReversedComparator", () => {
	test("matches the hand-written descending order", () => {
		const reversed = createReversedComparator(compareNaturalAscending);

		for (const a of [-1, 0, 1, 2]) {
			for (const b of [-1, 0, 1, 2]) {
				expect(reversed(a, b)).toBe(compareNaturalDescending(a, b));
			}
		}
	});
});

suite("createNullishFirstComparator", () => {
	test("orders null and undefined before everything, equivalent to each other", () => {
		const compare = createNullishFirstComparator(compareNaturalAscending);

		expect(compare(null, 1)).toBe(-1);
		expect(compare(1, undefined)).toBe(1);
		expect(compare(null, undefined)).toBe(0);
		expect(compare(1, 2)).toBe(-1);
	});
});

suite("createNullishLastComparator", () => {
	test("orders null and undefined after everything, equivalent to each other", () => {
		const compare = createNullishLastComparator(compareNaturalAscending);

		expect(compare(null, 1)).toBe(1);
		expect(compare(1, undefined)).toBe(-1);
		expect(compare(null, undefined)).toBe(0);
		expect(compare(1, 2)).toBe(-1);
	});
});

suite("createLexicographicalComparator", () => {
	const compare = createLexicographicalComparator(compareNaturalAscending);

	test("orders by the first differing element", () => {
		expect(compare([1, 2, 9], [1, 3, 0])).toBe(-1);
		expect(compare([1, 3, 0], [1, 2, 9])).toBe(1);
	});

	test("orders a proper prefix before the sequence extending it", () => {
		expect(compare([1, 2], [1, 2, 3])).toBe(-1);
		expect(compare([1, 2, 3], [1, 2])).toBe(1);
	});

	test("calls equal sequences equivalent, empty ones included", () => {
		expect(compare([1, 2, 3], [1, 2, 3])).toBe(0);
		expect(compare([], [])).toBe(0);
	});

	test("stops at the first difference and closes both iterators", () => {
		let closed = 0;
		function* counting(values: readonly number[]): Generator<number> {
			try {
				yield* values;
			} finally {
				closed++;
			}
		}

		expect(compare(counting([1, 9]), counting([2, 9]))).toBe(-1);
		expect(closed).toBe(2);
	});
});

suite("createEqualityComparator", () => {
	test("is true exactly where the comparator reports equivalence", () => {
		const isSame = createEqualityComparator(compareNaturalAscending);

		expect(isSame(1, 1)).toBe(true);
		expect(isSame(1, 2)).toBe(false);
		expect(isSame(-0, 0)).toBe(true);
	});

	test("agrees with `===` over the exact natural order", () => {
		const isSame = createEqualityComparator(compareNaturalAscending);
		const values = [
			Number.NEGATIVE_INFINITY,
			-1,
			-0,
			0,
			1,
			1 + Number.EPSILON,
			Number.POSITIVE_INFINITY,
		];

		for (const a of values) {
			for (const b of values) {
				expect(isSame(a, b)).toBe(a === b);
			}
		}
	});
});
