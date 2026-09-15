import { describe, expect, it } from "vitest";

import { take } from "./take.js";
import { tee } from "./tee.js";

function* counting(limit: number): IterableIterator<number> {
	for (let value = 0; value < limit; value++) {
		yield value;
	}
}

describe("tee", () => {
	it("should give every branch the same elements", () => {
		const [a, b] = tee(counting(3));

		expect([...a!]).toEqual([0, 1, 2]);
		expect([...b!]).toEqual([0, 1, 2]);
	});

	it("should default to two branches", () => {
		expect(tee(counting(1))).toHaveLength(2);
	});

	it("should produce as many branches as requested", () => {
		const branches = tee(counting(2), 4);

		expect(branches).toHaveLength(4);
		for (const branch of branches) {
			expect([...branch]).toEqual([0, 1]);
		}
	});

	it("should return no branches at a count of zero", () => {
		expect(tee(counting(3), 0)).toEqual([]);
	});

	it("should support a single branch", () => {
		const [only] = tee(counting(3), 1);

		expect([...only!]).toEqual([0, 1, 2]);
	});

	it("should give every branch nothing for an empty source", () => {
		const [a, b] = tee([]);

		expect([...a!]).toEqual([]);
		expect([...b!]).toEqual([]);
	});

	it("should pull the source only once", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			for (let value = 0; value < 3; value++) {
				produced++;
				yield value;
			}
		}

		const [a, b] = tee(counted());

		expect([...a!]).toEqual([0, 1, 2]);
		expect([...b!]).toEqual([0, 1, 2]);
		expect(produced).toBe(3);
	});

	it("should let branches advance independently", () => {
		const [a, b] = tee(counting(4));

		expect(a!.next().value).toBe(0);
		expect(a!.next().value).toBe(1);
		expect(b!.next().value).toBe(0);
		expect(a!.next().value).toBe(2);
		expect(b!.next().value).toBe(1);
	});

	it("should work on an infinite source", () => {
		function* naturals(): IterableIterator<number> {
			let value = 0;
			while (true) {
				yield value++;
			}
		}

		const [a, b] = tee(naturals());

		expect([...take(a!, 3)]).toEqual([0, 1, 2]);
		expect([...take(b!, 3)]).toEqual([0, 1, 2]);
	});

	it("should not buffer when branches read in lockstep", () => {
		const [a, b] = tee(counting(100));

		for (let step = 0; step < 100; step++) {
			expect(a!.next().value).toBe(step);
			expect(b!.next().value).toBe(step);
		}

		expect(a!.next().done).toBe(true);
		expect(b!.next().done).toBe(true);
	});

	it("should reject a negative or fractional count", () => {
		expect(() => tee(counting(1), -1)).toThrow(RangeError);
		expect(() => tee(counting(1), 1.5)).toThrow(RangeError);
	});
});
