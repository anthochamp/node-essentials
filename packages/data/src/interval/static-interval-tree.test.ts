import { expect, suite, test } from "vitest";

import { type Interval, StaticIntervalTree } from "./static-interval-tree.js";

const interval = (
	from: number,
	to: number,
	value = `${from}-${to}`,
): Interval<number, string> => ({ from, to, value });

const tree = (
	...intervals: Interval<number, string>[]
): StaticIntervalTree<number, string> => new StaticIntervalTree(intervals);

const sorted = (values: Iterable<string>): string[] =>
	Array.from(values).sort();

suite("StaticIntervalTree", () => {
	test("should find every interval containing a point", () => {
		const index = tree(
			interval(1, 5),
			interval(3, 8),
			interval(10, 12),
			interval(0, 20),
		);

		expect(sorted(index.stab(4))).toEqual(["0-20", "1-5", "3-8"]);
		expect(sorted(index.stab(11))).toEqual(["0-20", "10-12"]);
		expect(sorted(index.stab(9))).toEqual(["0-20"]);
		expect(sorted(index.stab(100))).toEqual([]);
	});

	test("should treat intervals as half-open", () => {
		const index = tree(interval(1, 5));

		expect(sorted(index.stab(1))).toEqual(["1-5"]);
		expect(sorted(index.stab(4))).toEqual(["1-5"]);
		// `to` is exclusive, so adjacent ranges tile without overlapping.
		expect(sorted(index.stab(5))).toEqual([]);
		expect(sorted(index.stab(0))).toEqual([]);
	});

	test("should let adjacent intervals tile without both matching", () => {
		const index = tree(interval(0, 5), interval(5, 10));

		expect(sorted(index.stab(5))).toEqual(["5-10"]);
		expect(sorted(index.stab(4))).toEqual(["0-5"]);
	});

	test("should find every interval overlapping a range", () => {
		const index = tree(
			interval(1, 5),
			interval(6, 8),
			interval(10, 12),
			interval(4, 7),
		);

		expect(sorted(index.overlapping(4, 7))).toEqual(["1-5", "4-7", "6-8"]);
		expect(sorted(index.overlapping(0, 1))).toEqual([]);
		expect(sorted(index.overlapping(0, 2))).toEqual(["1-5"]);
		expect(sorted(index.overlapping(12, 20))).toEqual([]);
	});

	test("should yield nothing for an empty or inverted query range", () => {
		const index = tree(interval(1, 5));

		expect(sorted(index.overlapping(3, 3))).toEqual([]);
		expect(sorted(index.overlapping(5, 2))).toEqual([]);
	});

	test("should handle an empty tree", () => {
		const index = tree();

		expect(index.count()).toBe(0);
		expect(sorted(index.stab(1))).toEqual([]);
		expect(sorted(index.overlapping(0, 10))).toEqual([]);
	});

	test("should reject an inverted interval", () => {
		expect(() => tree(interval(5, 1))).toThrow(RangeError);
	});

	test("should discard a zero-width interval, which contains no point", () => {
		const index = tree(interval(3, 3));

		expect(index.count()).toBe(0);
		expect(sorted(index.stab(3))).toEqual([]);
		expect(sorted(index.overlapping(0, 10))).toEqual([]);
	});

	test("should keep duplicates of the same range", () => {
		const index = tree(interval(1, 5, "a"), interval(1, 5, "b"));

		expect(sorted(index.stab(2))).toEqual(["a", "b"]);
	});

	test("should honour a caller-supplied comparator", () => {
		const index = new StaticIntervalTree<string, string>(
			[
				{ from: "a", to: "m", value: "first-half" },
				{ from: "m", to: "z", value: "second-half" },
			],
			{ comparator: (a, b) => (a < b ? -1 : a > b ? 1 : 0) },
		);

		expect(sorted(index.stab("c"))).toEqual(["first-half"]);
		expect(sorted(index.stab("q"))).toEqual(["second-half"]);
	});

	suite("against a linear scan", () => {
		const intervals: Interval<number, string>[] = [];

		// Deterministic, so a failure reproduces.
		let seed = 24_681;
		const next = (): number => {
			seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
			return seed % 1000;
		};

		for (let index = 0; index < 400; index++) {
			const from = next();
			intervals.push(interval(from, from + (next() % 100), `i${index}`));
		}

		// The tree discards empty intervals, so the reference must too, or it
		// "expects" matches for ranges that contain no point.
		const indexable = intervals.filter((item) => item.from < item.to);
		const index = new StaticIntervalTree(intervals);

		test("should agree on stabbing queries", () => {
			for (let point = 0; point < 1100; point += 17) {
				const expected = indexable
					.filter((item) => item.from <= point && point < item.to)
					.map((item) => item.value)
					.sort();

				expect(sorted(index.stab(point))).toEqual(expected);
			}
		});

		test("should agree on overlap queries", () => {
			for (let from = 0; from < 1100; from += 53) {
				const to = from + 40;

				const expected = indexable
					.filter((item) => item.from < to && from < item.to)
					.map((item) => item.value)
					.sort();

				expect(sorted(index.overlapping(from, to))).toEqual(expected);
			}
		});
	});
});
