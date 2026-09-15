import { describe, expect, it } from "vitest";

import { bigIntDividesPowerOf } from "./divides-power-of.js";

describe("bigIntDividesPowerOf", () => {
	it("accepts a unit, which divides the zeroth power", () => {
		expect(bigIntDividesPowerOf(1n, 10n)).toBe(true);
	});

	it("rejects zero, which divides no power", () => {
		expect(bigIntDividesPowerOf(0n, 10n)).toBe(false);
	});

	it("answers the base-10 terminating-denominator rule", () => {
		for (const denominator of [2n, 4n, 5n, 8n, 10n, 16n, 20n, 25n, 40n, 625n]) {
			expect(bigIntDividesPowerOf(denominator, 10n)).toBe(true);
		}

		for (const denominator of [3n, 6n, 7n, 9n, 11n, 12n, 14n, 15n, 30n]) {
			expect(bigIntDividesPowerOf(denominator, 10n)).toBe(false);
		}
	});

	it("uses every prime of the base, not just the smallest", () => {
		expect(bigIntDividesPowerOf(3n, 12n)).toBe(true);
		expect(bigIntDividesPowerOf(9n, 12n)).toBe(true);
		expect(bigIntDividesPowerOf(27n, 12n)).toBe(true);
		expect(bigIntDividesPowerOf(5n, 12n)).toBe(false);
		expect(bigIntDividesPowerOf(15n, 12n)).toBe(false);
	});

	it("agrees with trial-division factorization", () => {
		// Independent oracle: every prime factor of `value` must divide `base`.
		const byFactoring = (value: bigint, base: bigint): boolean => {
			let remaining = value;

			for (let prime = 2n; prime * prime <= remaining; prime++) {
				while (remaining % prime === 0n) {
					if (base % prime !== 0n) {
						return false;
					}

					remaining /= prime;
				}
			}

			return remaining === 1n || base % remaining === 0n;
		};

		for (const base of [2n, 3n, 6n, 10n, 12n, 16n, 30n]) {
			for (let value = 1n; value <= 300n; value++) {
				expect(bigIntDividesPowerOf(value, base)).toBe(
					byFactoring(value, base),
				);
			}
		}
	});

	it("ignores the sign of both arguments", () => {
		expect(bigIntDividesPowerOf(-8n, 10n)).toBe(true);
		expect(bigIntDividesPowerOf(8n, -10n)).toBe(true);
		expect(bigIntDividesPowerOf(-3n, 10n)).toBe(false);
	});

	it("handles values far past the safe-integer range", () => {
		expect(bigIntDividesPowerOf(2n ** 200n * 5n ** 50n, 10n)).toBe(true);
		expect(bigIntDividesPowerOf(2n ** 200n * 3n, 10n)).toBe(false);
	});

	it("rejects a base with no meaningful powers", () => {
		for (const base of [1n, 0n, -1n]) {
			expect(() => bigIntDividesPowerOf(4n, base)).toThrow(RangeError);
		}
	});
});
