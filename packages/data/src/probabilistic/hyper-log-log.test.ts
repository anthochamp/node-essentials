import { expect, suite, test } from "vitest";

import { distinctStrings, hashString } from "./__fixtures__/hash.js";
import { HyperLogLog } from "./hyper-log-log.js";

const estimator = (precision?: number): HyperLogLog<string> =>
	new HyperLogLog<string>(undefined, { hash: hashString, precision });

/** How far the estimate is from the truth, as a fraction of the truth. */
const errorOf = (estimated: number, actual: number): number =>
	Math.abs(estimated - actual) / actual;

suite("HyperLogLog", () => {
	test("should reject a precision outside [4, 16]", () => {
		expect(() => estimator(3)).toThrow(RangeError);
		expect(() => estimator(17)).toThrow(RangeError);
		expect(() => estimator(12.5)).toThrow(RangeError);
	});

	test("should count nothing before anything is added", () => {
		expect(estimator().count()).toBe(0);
	});

	test("should land within a couple of items on small cardinalities, where linear counting takes over", () => {
		for (const size of [1, 10, 100]) {
			const hll = estimator(12);

			hll.addAll(distinctStrings(size));

			// Not exact even here: two items can share a register and become
			// indistinguishable, which can only undercount.
			expect(Math.abs(hll.count() - size)).toBeLessThanOrEqual(2);
		}
	});

	test("should ignore duplicates", () => {
		const hll = estimator(12);

		hll.addAll(distinctStrings(50));
		const afterFirstPass = hll.count();

		for (let round = 0; round < 100; round++) {
			hll.addAll(distinctStrings(50));
		}

		// Re-adding the same items must not move the estimate at all.
		expect(hll.count()).toBe(afterFirstPass);
		expect(Math.abs(afterFirstPass - 50)).toBeLessThanOrEqual(2);
	});

	test("should estimate a large cardinality within its stated error", () => {
		const SIZE = 100_000;
		const hll = estimator(14);

		hll.addAll(distinctStrings(SIZE));

		// Three sigma of the estimator's own advertised relative error.
		expect(errorOf(hll.count(), SIZE)).toBeLessThan(hll.relativeError * 3);
	});

	test("should get more accurate as precision rises", () => {
		const SIZE = 50_000;
		const items = distinctStrings(SIZE);

		const coarse = estimator(6);
		const fine = estimator(14);

		coarse.addAll(items);
		fine.addAll(items);

		expect(fine.relativeError).toBeLessThan(coarse.relativeError);
		expect(errorOf(fine.count(), SIZE)).toBeLessThan(
			errorOf(coarse.count(), SIZE),
		);
	});

	test("should use memory independent of the cardinality", () => {
		const small = estimator(12);
		const large = estimator(12);

		small.addAll(distinctStrings(10));
		large.addAll(distinctStrings(200_000));

		expect(small.registerCount).toBe(large.registerCount);
		expect(small.registerCount).toBe(4096);
	});

	test("should clear back to zero", () => {
		const hll = estimator(12);

		hll.addAll(distinctStrings(1000));
		hll.clear();

		expect(hll.count()).toBe(0);
	});

	suite("merge", () => {
		test("should estimate the union of two disjoint streams", () => {
			const left = estimator(14);
			const right = estimator(14);

			left.addAll(distinctStrings(20_000, "left"));
			right.addAll(distinctStrings(20_000, "right"));

			left.merge(right);

			expect(errorOf(left.count(), 40_000)).toBeLessThan(
				left.relativeError * 3,
			);
		});

		test("should not double-count an overlap, unlike summing two counts", () => {
			const left = estimator(14);
			const right = estimator(14);

			const shared = distinctStrings(20_000, "shared");

			left.addAll(shared);
			right.addAll(shared);

			const summed = left.count() + right.count();
			left.merge(right);

			expect(errorOf(left.count(), 20_000)).toBeLessThan(
				left.relativeError * 3,
			);
			// Summing would have said ~40 000; merging is what makes partitions work.
			expect(summed).toBeGreaterThan(left.count() * 1.5);
		});

		test("should leave the merged-from estimator untouched", () => {
			const left = estimator(12);
			const right = estimator(12);

			left.addAll(distinctStrings(100, "left"));
			right.addAll(distinctStrings(100, "right"));

			const before = right.count();
			left.merge(right);

			expect(right.count()).toBe(before);
		});

		test("should refuse estimators of a different precision", () => {
			expect(() => estimator(12).merge(estimator(14))).toThrow(RangeError);
		});
	});
});
