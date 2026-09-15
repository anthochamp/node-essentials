import { MASK_64N, wordsForBits } from "@ac-kit/core";
import { limb64FromBigInt, limb64ToBigInt } from "@ac-kit/math-integer";
import { xorshift32 } from "@ac-kit/math-random";
import { describe, expect, it } from "vitest";

import { constantTimeModInvPrime } from "../../mod-inv-prime.js";
import {
	activeConstantTimeKernel,
	installConstantTimeKernel,
} from "../common/kernel.js";
import { montgomeryN0Inv } from "../common/montgomery-n0-inv.js";
import { montgomeryRSquared } from "../common/montgomery-r-squared.js";
import { createWasmConstantTimeKernel } from "./kernel.js";

/**
 * Correctness only. Whether this kernel is actually constant-time on real
 * hardware is a question for the dudect-style timing harness in
 * `@ac-kit/benchmarks` (`src/crypto-safe/constant-time-timing.bench.ts`), not
 * for a functional test — a test can observe wrong answers, never a timing
 * leak.
 *
 * The kernel is embedded in the package (see `scripts/embed-wasm.mjs`) and
 * auto-installed on import, so no availability check is needed here.
 */

installConstantTimeKernel(await createWasmConstantTimeKernel());

const kernel = activeConstantTimeKernel();

/** A deterministic operand generator, so a failure is reproducible. */
function* randomBigints(count: number, bits: number): Generator<bigint> {
	const rand = xorshift32(0x9e3779b9);

	const nextByte = () => rand() * 4294967296;

	for (let index = 0; index < count; index++) {
		let value = 0n;

		for (let bit = 0; bit < bits; bit += 8) {
			value |= BigInt(nextByte()) << BigInt(bit);
		}

		yield value & ((1n << BigInt(bits)) - 1n);
	}
}

// A small known prime for exact, hand-checkable cases, and a larger one for
// the random sweeps — large enough that "every word matters" but small enough
// that the reference BigInt operations in this test stay fast.
const SMALL_PRIME = 97n;
const BITS = 256;
const LARGE_PRIME =
	// A 256-bit prime (secp256r1's field prime), chosen because it is a
	// public, checkable constant rather than one this test invents.
	115792089210356248762697446949407573530086143415290314195533631308867097853951n;

describe("constant-time WASM kernel", () => {
	describe("add / sub / cmp", () => {
		const words = wordsForBits(BITS, 64);

		it("matches BigInt addition, including the carry", () => {
			for (const a of randomBigints(30, BITS)) {
				for (const b of randomBigints(3, BITS)) {
					const sum = a + b;
					const modulus = 1n << BigInt(64 * words);
					const { result, carry } = kernel.add(
						limb64FromBigInt(a, words),
						limb64FromBigInt(b, words),
						words,
					);

					expect(limb64ToBigInt(result)).toBe(sum % modulus);
					expect(carry).toBe(sum >= modulus ? 1 : 0);
				}
			}
		});

		it("matches BigInt subtraction, including the borrow", () => {
			for (const a of randomBigints(30, BITS)) {
				for (const b of randomBigints(3, BITS)) {
					const modulus = 1n << BigInt(64 * words);
					const { result, borrow } = kernel.sub(
						limb64FromBigInt(a, words),
						limb64FromBigInt(b, words),
						words,
					);

					expect(limb64ToBigInt(result)).toBe(
						(((a - b) % modulus) + modulus) % modulus,
					);
					expect(borrow).toBe(a < b ? 1 : 0);
				}
			}
		});

		it("orders values the same way BigInt does", () => {
			const samples = [0n, 1n, 2n, ...randomBigints(30, BITS)];

			for (const a of samples) {
				for (const b of samples) {
					const expected = a < b ? -1 : a > b ? 1 : 0;

					expect(
						kernel.cmp(
							limb64FromBigInt(a, words),
							limb64FromBigInt(b, words),
							words,
						),
					).toBe(expected);
				}
			}
		});
	});

	describe("Montgomery arithmetic", () => {
		const words = wordsForBits(BITS, 64);
		const n0inv = montgomeryN0Inv(LARGE_PRIME & MASK_64N);
		const rSquared = montgomeryRSquared(LARGE_PRIME, words);
		const modulusLimbs = limb64FromBigInt(LARGE_PRIME, words);
		const rSquaredLimbs = limb64FromBigInt(rSquared, words);

		it("round-trips to and from Montgomery form", () => {
			for (const value of randomBigints(20, BITS)) {
				const a = value % LARGE_PRIME;
				const montgomery = kernel.toMontgomery(
					limb64FromBigInt(a, words),
					modulusLimbs,
					rSquaredLimbs,
					n0inv,
					words,
				);
				const back = kernel.fromMontgomery(
					montgomery,
					modulusLimbs,
					n0inv,
					words,
				);

				expect(limb64ToBigInt(back)).toBe(a);
			}
		});

		it("multiplies the same as BigInt mulmod", () => {
			for (const av of randomBigints(15, BITS)) {
				for (const bv of randomBigints(2, BITS)) {
					const a = av % LARGE_PRIME;
					const b = bv % LARGE_PRIME;
					const expected = (a * b) % LARGE_PRIME;

					const aMont = kernel.toMontgomery(
						limb64FromBigInt(a, words),
						modulusLimbs,
						rSquaredLimbs,
						n0inv,
						words,
					);
					const bMont = kernel.toMontgomery(
						limb64FromBigInt(b, words),
						modulusLimbs,
						rSquaredLimbs,
						n0inv,
						words,
					);
					const productMont = kernel.montgomeryMultiply(
						aMont,
						bMont,
						modulusLimbs,
						n0inv,
						words,
					);
					const product = kernel.fromMontgomery(
						productMont,
						modulusLimbs,
						n0inv,
						words,
					);

					expect(limb64ToBigInt(product)).toBe(expected);
				}
			}
		});
	});

	describe("modExp", () => {
		const words = wordsForBits(BITS, 64);

		it("matches BigInt modpow against a small prime", () => {
			const modulus = SMALL_PRIME;
			const n0inv = montgomeryN0Inv(modulus & MASK_64N);
			const rSquared = montgomeryRSquared(modulus, words);

			for (const base of [1n, 2n, 3n, 5n, 10n, 96n]) {
				for (const exponent of [0n, 1n, 2n, 7n, 95n, 96n]) {
					let expected = 1n;
					let b = base % modulus;
					let e = exponent;

					while (e > 0n) {
						if (e & 1n) {
							expected = (expected * b) % modulus;
						}

						b = (b * b) % modulus;
						e >>= 1n;
					}

					const result = kernel.modExp(
						limb64FromBigInt(base % modulus, words),
						limb64FromBigInt(exponent, words),
						limb64FromBigInt(modulus, words),
						limb64FromBigInt(rSquared, words),
						n0inv,
						BITS,
						words,
					);

					expect(limb64ToBigInt(result)).toBe(expected);
				}
			}
		});

		it("matches BigInt modpow against a 256-bit prime", () => {
			const n0inv = montgomeryN0Inv(LARGE_PRIME & MASK_64N);
			const rSquared = montgomeryRSquared(LARGE_PRIME, words);

			for (const baseValue of randomBigints(5, BITS)) {
				for (const exponentValue of randomBigints(2, BITS)) {
					const base = baseValue % LARGE_PRIME;
					const exponent = exponentValue % (LARGE_PRIME - 1n);

					let expected = 1n;
					let b = base;
					let e = exponent;

					while (e > 0n) {
						if (e & 1n) {
							expected = (expected * b) % LARGE_PRIME;
						}

						b = (b * b) % LARGE_PRIME;
						e >>= 1n;
					}

					const result = kernel.modExp(
						limb64FromBigInt(base, words),
						limb64FromBigInt(exponent, words),
						limb64FromBigInt(LARGE_PRIME, words),
						limb64FromBigInt(rSquared, words),
						n0inv,
						BITS,
						words,
					);

					expect(limb64ToBigInt(result)).toBe(expected);
				}
			}
		});
	});

	describe("constantTimeModInvPrime", () => {
		it("inverts values mod a 256-bit prime", () => {
			for (const value of randomBigints(20, BITS)) {
				const a = value % LARGE_PRIME;

				if (a === 0n) {
					continue;
				}

				const inverse = constantTimeModInvPrime(a, LARGE_PRIME, BITS);

				expect((a * inverse) % LARGE_PRIME).toBe(1n);
			}
		});

		it("rejects an even modulus", () => {
			expect(() => constantTimeModInvPrime(3n, 100n, BITS)).toThrow(RangeError);
		});
	});

	describe("barrettReduce", () => {
		const words = wordsForBits(BITS, 64);

		it("matches BigInt's remainder for a double-width value", () => {
			const mu = (1n << BigInt(128 * words)) / LARGE_PRIME;
			const muLimbs = limb64FromBigInt(mu, words + 1);
			const modulusLimbs = limb64FromBigInt(LARGE_PRIME, words);

			for (const value of randomBigints(20, 2 * BITS)) {
				const expected = value % LARGE_PRIME;
				const result = kernel.barrettReduce(
					limb64FromBigInt(value, 2 * words),
					modulusLimbs,
					muLimbs,
					words,
				);

				expect(limb64ToBigInt(result)).toBe(expected);
			}
		});
	});
});

describe("montgomeryN0Inv", () => {
	it("produces a value that inverts the modulus's low limb mod 2^64", () => {
		for (const modulus0 of [1n, 3n, 97n, LARGE_PRIME & MASK_64N]) {
			const n0inv = montgomeryN0Inv(modulus0);

			expect((modulus0 * n0inv + 1n) & MASK_64N).toBe(0n);
		}
	});

	it("rejects an even value", () => {
		expect(() => montgomeryN0Inv(4n)).toThrow(RangeError);
	});
});

describe("limb64FromBigInt / limb64ToBigInt", () => {
	it("round-trips arbitrary values", () => {
		for (const value of randomBigints(20, 256)) {
			expect(limb64ToBigInt(limb64FromBigInt(value, 4))).toBe(value);
		}
	});

	it("rejects a negative value", () => {
		expect(() => limb64FromBigInt(-1n, 4)).toThrow(RangeError);
	});

	it("rejects a value that does not fit", () => {
		expect(() => limb64FromBigInt(1n << 300n, 4)).toThrow(RangeError);
	});
});
