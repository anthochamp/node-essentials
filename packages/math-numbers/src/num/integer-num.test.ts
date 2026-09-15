import { gcd } from "@ac-kit/math-algebra";
import { describe, expect, it } from "vitest";

import { Integer } from "./integer-num.js";

const domain = Integer.euclideanDomain;

function b(n: bigint | number): Integer {
	return Integer.from(n);
}

describe("gcd — generic Euclidean algorithm", () => {
	describe("with Integer.euclideanDomain", () => {
		it("gcd(12, 8) = 4", () => {
			expect(gcd(b(12), b(8), domain).valueOf()).toBe(4);
		});

		it("gcd(18, 12) = 6", () => {
			expect(gcd(b(18), b(12), domain).valueOf()).toBe(6);
		});

		it("gcd(a, 0) = a (convention)", () => {
			expect(gcd(b(7), b(0), domain).valueOf()).toBe(7);
		});

		it("gcd(0, b) = b (convention)", () => {
			expect(gcd(b(0), b(5), domain).valueOf()).toBe(5);
		});

		it("gcd(a, a) = a", () => {
			expect(gcd(b(13), b(13), domain).valueOf()).toBe(13);
		});

		it("gcd of coprimes = 1", () => {
			expect(gcd(b(17), b(13), domain).valueOf()).toBe(1);
		});

		it("gcd(0, 0) = 0", () => {
			expect(gcd(b(0), b(0), domain).valueOf()).toBe(0);
		});

		it("result is non-negative for negative inputs", () => {
			expect(gcd(b(-18), b(12), domain).valueOf()).toBe(6);
			expect(gcd(b(18), b(-12), domain).valueOf()).toBe(6);
			expect(gcd(b(-18), b(-12), domain).valueOf()).toBe(6);
		});

		it("works for large values", () => {
			// Use 2^32 × 3 and 2^32 × 5 → gcd = 2^32 (still safe as Number)
			const k = 2n ** 32n; // 4_294_967_296 < Number.MAX_SAFE_INTEGER
			const a = Integer.from(k * 3n);
			const c = Integer.from(k * 5n);
			expect(gcd(a, c, domain).valueOf()).toBe(Number(k));
		});
	});
});
