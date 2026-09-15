import { describe, expect, it } from "vitest";

import { take } from "./take.js";

describe("take", () => {
	it("should yield the leading elements", () => {
		expect([...take([1, 2, 3, 4], 2)]).toEqual([1, 2]);
	});

	it("should yield everything when the count exceeds the length", () => {
		expect([...take([1, 2], 5)]).toEqual([1, 2]);
	});

	it("should yield nothing at a count of zero", () => {
		expect([...take([1, 2, 3], 0)]).toEqual([]);
	});

	it("should agree with Array.prototype.slice", () => {
		const values = [1, 2, 3, 4, 5];

		expect([...take(values, 3)]).toEqual(values.slice(0, 3));
	});

	it("should terminate on an infinite iterable", () => {
		function* naturals(): IterableIterator<number> {
			let value = 0;
			while (true) {
				yield value++;
			}
		}

		expect([...take(naturals(), 4)]).toEqual([0, 1, 2, 3]);
	});

	it("should consume nothing at a count of zero", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		expect([...take(counted(), 0)]).toEqual([]);
		expect(produced).toBe(0);
	});

	it("should close the source once the quota is met", () => {
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

		expect([...take(closable(), 2)]).toEqual([0, 1]);
		expect(returned).toBe(true);
	});

	it("should reject a negative or fractional count", () => {
		expect(() => [...take([1], -1)]).toThrow(RangeError);
		expect(() => [...take([1], 1.5)]).toThrow(RangeError);
	});
});
