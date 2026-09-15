import { describe, expect, it } from "vitest";

import { consume } from "./consume.js";
import { tap } from "./tap.js";

describe("consume", () => {
	it("should drain the whole iterable by default", () => {
		const seen: number[] = [];
		consume(tap([1, 2, 3], (value) => seen.push(value)));

		expect(seen).toEqual([1, 2, 3]);
	});

	it("should drain only the requested count", () => {
		const seen: number[] = [];
		consume(
			tap([1, 2, 3, 4], (value) => seen.push(value)),
			2,
		);

		expect(seen).toEqual([1, 2]);
	});

	it("should stop early when the source is shorter than the count", () => {
		const seen: number[] = [];
		consume(
			tap([1], (value) => seen.push(value)),
			5,
		);

		expect(seen).toEqual([1]);
	});

	it("should do nothing at a count of zero", () => {
		const seen: number[] = [];
		consume(
			tap([1, 2], (value) => seen.push(value)),
			0,
		);

		expect(seen).toEqual([]);
	});

	it("should accept an empty iterable", () => {
		expect(() => consume([])).not.toThrow();
	});

	it("should terminate on an infinite iterable when given a count", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		consume(counted(), 3);

		expect(produced).toBe(3);
	});

	it("should close the iterator when a count cuts the drain short", () => {
		let returned = false;
		function* closable(): IterableIterator<number> {
			try {
				let value = 0;
				while (true) {
					yield value++;
				}
			} finally {
				returned = true;
			}
		}

		consume(closable(), 2);

		expect(returned).toBe(true);
	});

	it("should reject a negative or fractional count", () => {
		expect(() => consume([1], -1)).toThrow(RangeError);
		expect(() => consume([1], 1.5)).toThrow(RangeError);
	});
});
