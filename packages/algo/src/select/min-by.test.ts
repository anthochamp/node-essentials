import { expect, suite, test } from "vitest";

import { minBy } from "./min-by.js";

const brute = <T>(
	items: readonly T[],
	valueOf: (item: T) => number,
): T | null =>
	items.length === 0
		? null
		: items.reduce((best, item) =>
				valueOf(item) < valueOf(best) ? item : best,
			);

suite("minBy", () => {
	test("returns null for an empty iterable", () => {
		expect(minBy([], (value: number) => value)).toBeNull();
	});

	test("returns the item with the smallest projected value", () => {
		const items = [{ n: 3 }, { n: 1 }, { n: 2 }];

		expect(minBy(items, (item) => item.n)).toBe(items[1]);
	});

	test("resolves a tie to the first item seen", () => {
		const items = [
			{ id: "a", n: 1 },
			{ id: "b", n: 1 },
		];

		expect(minBy(items, (item) => item.n)).toBe(items[0]);
	});

	test("handles negative and fractional values", () => {
		expect(minBy([0, -2.5, 4, -2.4], (value) => value)).toBe(-2.5);
	});

	test("accepts any iterable, not just an array", () => {
		expect(minBy(new Set([5, 3, 9]), (value) => value)).toBe(3);
	});

	test("calls the accessor exactly once per item", () => {
		let calls = 0;
		minBy([1, 2, 3, 4], (value) => {
			calls++;
			return value;
		});

		expect(calls).toBe(4);
	});

	test("matches a brute-force reduce over random inputs", () => {
		for (let round = 0; round < 200; round++) {
			const items = Array.from(
				{ length: 1 + Math.floor(Math.random() * 20) },
				() => ({ n: Math.floor(Math.random() * 50) - 25 }),
			);
			const valueOf = (item: { n: number }) => item.n;

			expect(minBy(items, valueOf)).toBe(brute(items, valueOf));
		}
	});
});
