import { expect, suite, test } from "vitest";

import { factorial } from "./factorial.js";

suite("factorial", () => {
	test("matches the small factorials exactly", () => {
		const expected = [
			1n,
			1n,
			2n,
			6n,
			24n,
			120n,
			720n,
			5040n,
			40320n,
			362880n,
			3628800n,
		];
		for (const [n, value] of expected.entries()) {
			expect(factorial(n)).toBe(value);
		}
	});

	test("stays exact past the safe-integer ceiling", () => {
		// 21! is the first factorial a `number` cannot hold.
		expect(factorial(21)).toBe(51090942171709440000n);
		expect(factorial(30)).toBe(265252859812191058636308480000000n);
	});

	test("satisfies its own recurrence across the cache boundary", () => {
		// 256 is where the table stops and the tail is multiplied out instead.
		for (const n of [1, 50, 255, 256, 257, 400]) {
			expect(factorial(n)).toBe(factorial(n - 1) * BigInt(n));
		}
	});

	test("returns the same value whether or not the table was warm", () => {
		const cold = factorial(300);
		const warm = factorial(300);
		expect(warm).toBe(cold);
	});

	test("rejects non-integers and negatives", () => {
		expect(() => factorial(-1)).toThrow(RangeError);
		expect(() => factorial(1.5)).toThrow(RangeError);
		expect(() => factorial(Number.NaN)).toThrow(RangeError);
	});
});
