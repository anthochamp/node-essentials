import { describe, expect, it } from "vitest";

import { bigIntModPow } from "./mod-pow.js";

describe("bigIntModPow", () => {
	it("matches repeated multiplication for small exponents", () => {
		expect(bigIntModPow(3n, 5n, 100n)).toBe(43n); // 3^5 = 243, 243 % 100 = 43
		expect(bigIntModPow(2n, 10n, 1000n)).toBe(24n); // 2^10 = 1024, % 1000 = 24
	});

	it("handles an exponent of zero", () => {
		expect(bigIntModPow(5n, 0n, 7n)).toBe(1n);
	});

	it("stays exact for operands well past Number.MAX_SAFE_INTEGER", () => {
		const modulus = (1n << 256n) - 189n; // a large odd modulus
		const result = bigIntModPow(2n, modulus - 1n, modulus);

		expect(result >= 0n && result < modulus).toBe(true);
	});
});
