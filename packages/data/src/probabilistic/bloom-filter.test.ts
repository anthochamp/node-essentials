import { expect, suite, test } from "vitest";

import { distinctStrings, hashString } from "./__fixtures__/hash.js";
import { BloomFilter } from "./bloom-filter.js";

const filter = (
	expectedItems = 1000,
	falsePositiveRate?: number,
): BloomFilter<string> =>
	new BloomFilter<string>(undefined, {
		hash: hashString,
		expectedItems,
		falsePositiveRate,
	});

suite("BloomFilter", () => {
	test("should reject invalid sizing parameters", () => {
		expect(() => filter(0)).toThrow(RangeError);
		expect(() => filter(1.5)).toThrow(RangeError);
		expect(() => filter(10, 0)).toThrow(RangeError);
		expect(() => filter(10, 1)).toThrow(RangeError);
		expect(() => filter(10, -0.5)).toThrow(RangeError);
	});

	test("should never report a false negative", () => {
		const items = distinctStrings(1000);
		const bloom = filter(1000);

		bloom.addAll(items);

		for (const item of items) {
			expect(bloom.has(item)).toBe(true);
		}
	});

	test("should be empty before anything is added", () => {
		const bloom = filter();

		expect(bloom.count()).toBe(0);
		expect(bloom.has("anything")).toBe(false);
		expect(bloom.estimatedFalsePositiveRate()).toBe(0);
	});

	test("should size itself from the requested false-positive rate", () => {
		const lenient = filter(1000, 0.1);
		const strict = filter(1000, 0.001);

		// A tighter rate buys more bits and more hashes.
		expect(strict.bitCount).toBeGreaterThan(lenient.bitCount);
		expect(strict.hashCount).toBeGreaterThan(lenient.hashCount);
	});

	test("should hold its false-positive rate near the one requested", () => {
		const TARGET = 0.01;
		const SIZE = 2000;
		const bloom = filter(SIZE, TARGET);

		bloom.addAll(distinctStrings(SIZE, "present"));

		let falsePositives = 0;
		const probes = distinctStrings(SIZE, "absent");

		for (const probe of probes) {
			if (bloom.has(probe)) {
				falsePositives++;
			}
		}

		// Generous headroom: this asserts the sizing maths is right, not that the
		// sample landed on its expectation.
		expect(falsePositives / probes.length).toBeLessThan(TARGET * 4);
	});

	test("should report a measured false-positive rate that tracks the fill", () => {
		const bloom = filter(1000, 0.01);

		bloom.addAll(distinctStrings(1000));

		const measured = bloom.estimatedFalsePositiveRate();

		expect(measured).toBeGreaterThan(0);
		expect(measured).toBeLessThan(0.05);
	});

	test("should not count a re-added item twice", () => {
		const bloom = filter();

		bloom.add("a");
		bloom.add("a");

		expect(bloom.count()).toBe(1);
	});

	test("should clear every bit", () => {
		const bloom = filter();

		bloom.addAll(distinctStrings(100));
		bloom.clear();

		expect(bloom.count()).toBe(0);
		expect(bloom.estimatedFalsePositiveRate()).toBe(0);
		expect(bloom.has("item-0")).toBe(false);
	});

	suite("merge", () => {
		test("should hold the union of both filters", () => {
			const left = filter();
			const right = filter();

			left.addAll(distinctStrings(50, "left"));
			right.addAll(distinctStrings(50, "right"));

			left.merge(right);

			for (const item of distinctStrings(50, "left")) {
				expect(left.has(item)).toBe(true);
			}
			for (const item of distinctStrings(50, "right")) {
				expect(left.has(item)).toBe(true);
			}
		});

		test("should leave the merged-from filter untouched", () => {
			const left = filter();
			const right = filter();

			left.add("only-left");
			right.add("only-right");

			left.merge(right);

			expect(right.has("only-left")).toBe(false);
		});

		test("should refuse filters of a different geometry", () => {
			const small = filter(100);
			const large = filter(10_000);

			expect(() => small.merge(large)).toThrow(RangeError);
		});
	});
});
