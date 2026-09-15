import { describe, expect, it } from "vitest";

import { bigIntIsPrime } from "./is-prime.js";

describe("bigIntIsPrime", () => {
	it("classifies small numbers", () => {
		expect(bigIntIsPrime(0n)).toBe(false);
		expect(bigIntIsPrime(1n)).toBe(false);
		expect(bigIntIsPrime(2n)).toBe(true);
		expect(bigIntIsPrime(3n)).toBe(true);
		expect(bigIntIsPrime(4n)).toBe(false);
		expect(bigIntIsPrime(9n)).toBe(false);
	});

	it("finds the primes below 50", () => {
		const primes = [];

		for (let n = 2n; n < 50n; n++) {
			if (bigIntIsPrime(n)) {
				primes.push(n);
			}
		}

		expect(primes).toEqual([
			2n,
			3n,
			5n,
			7n,
			11n,
			13n,
			17n,
			19n,
			23n,
			29n,
			31n,
			37n,
			41n,
			43n,
			47n,
		]);
	});

	it("rejects a large known composite and accepts a large known prime", () => {
		// 2^67 - 1, a famous "prime candidate" that Mersenne's own conjecture
		// got wrong: it factors as 193707721 x 761838257287.
		expect(bigIntIsPrime((1n << 67n) - 1n)).toBe(false);
		// A 128-bit-scale prime, well past the point a naive trial division
		// would be practical.
		expect(bigIntIsPrime((1n << 127n) - 1n)).toBe(true);
	});
});
