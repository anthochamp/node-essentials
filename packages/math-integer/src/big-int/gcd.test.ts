import { describe, expect, it } from "vitest";

import { bigIntGcd } from "./gcd.js";

describe("bigIntGcd", () => {
	it("is non-negative regardless of operand signs", () => {
		expect(bigIntGcd(12n, 18n)).toBe(6n);
		expect(bigIntGcd(-12n, 18n)).toBe(6n);
		expect(bigIntGcd(12n, -18n)).toBe(6n);
		expect(bigIntGcd(-12n, -18n)).toBe(6n);
	});

	it("handles zero on either side", () => {
		expect(bigIntGcd(0n, 5n)).toBe(5n);
		expect(bigIntGcd(5n, 0n)).toBe(5n);
		expect(bigIntGcd(0n, 0n)).toBe(0n);
	});

	it("divides both operands and is maximal", () => {
		const a = 2n ** 90n * 15n;
		const b = 2n ** 88n * 35n;
		const divisor = bigIntGcd(a, b);

		expect(a % divisor).toBe(0n);
		expect(b % divisor).toBe(0n);
		expect(divisor).toBe(2n ** 88n * 5n);
	});
});
