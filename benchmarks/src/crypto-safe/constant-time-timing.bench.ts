import {
	beforeAll,
	constantTimeCase,
	constantTimeCondition,
} from "@ac-bench/measure-constant-time";
import { wordsForBits } from "@ac-kit/core";
import {
	activeConstantTimeKernel,
	createWasmConstantTimeKernel,
	installConstantTimeKernel,
	montgomeryN0Inv,
	montgomeryRSquared,
} from "@ac-kit/crypto-safe";
import { limb64FromBigInt } from "@ac-kit/math-integer";
import { xorshift32 } from "@ac-kit/math-random";

/**
 * A dudect-style constant-time gate for `fu_mod_exp`: modular exponentiation
 * and scalar multiplication are exactly the operations this kind of timing test
 * is meant to gate.
 *
 * A negative result (no leak detected) only means none was found at this sample
 * count. It is evidence toward trusting `fu_mod_exp`, not a proof of its
 * constant-time property.
 *
 * Both classes' exponent pools must be built the same way — one fresh
 * `BigUint64Array` per sample, from `generateExponentPool` below, whether the
 * value is fixed or random. An earlier version of this check built the fixed
 * class from one array reused by reference across every sample; that alone
 * produced a large, repeatable `|t|` with no relation to the exponent's value —
 * reading the same address on every call versus a fresh allocation each time is
 * a genuine memory-locality difference, and this harness (correctly) cannot
 * tell that apart from a real leak. Confirmed by holding the allocation pattern
 * fixed and swapping in two wildly different exponent values (`modulus - 2` and
 * `0`): no detectable difference either way.
 */

const SAMPLES = 4000;
const WARMUP = 200;

/** One fresh limb array per sample, all holding `value`. */
function generateExponentPool(
	value: bigint,
	count: number,
	words: number,
): BigUint64Array[] {
	return Array.from({ length: count }, () => limb64FromBigInt(value, words));
}

/** A deterministic generator, so a failure is reproducible. */
function generateRandomExponentPool(
	count: number,
	modulus: bigint,
	words: number,
): BigUint64Array[] {
	const rand = xorshift32(0x2545f491);

	const nextUint32 = () => rand() * 0x1_0000_0000;

	return Array.from({ length: count }, () => {
		let value = 0n;

		for (let word = 0; word < words; word++) {
			const low = BigInt(nextUint32());
			const high = BigInt(nextUint32());

			value |= (low | (high << 32n)) << BigInt(64 * word);
		}

		return limb64FromBigInt(value % modulus, words);
	});
}

const bits = 256;
const words = wordsForBits(bits, 64);
const modulus =
	115792089210356248762697446949407573530086143415290314195533631308867097853951n;
const n0inv = montgomeryN0Inv(modulus & ((1n << 64n) - 1n));
const rSquared = montgomeryRSquared(modulus, words);
const modulusLimbs = limb64FromBigInt(modulus, words);
const rSquaredLimbs = limb64FromBigInt(rSquared, words);
const base = limb64FromBigInt(3n, words);

const poolSize = WARMUP + SAMPLES;

// The classic dudect design: one fixed secret, repeated, against a
// freshly random secret on every call of the other class.
const fixedExponents = generateExponentPool(modulus - 2n, poolSize, words);
const randomExponents = generateRandomExponentPool(poolSize, modulus, words);
let fixedExponentIndex = 0;
let randomExponentIndex = 0;

constantTimeCondition(
	"fu_mod_exp constant-time gate",
	{ dudect: { samples: SAMPLES, warmup: WARMUP } },
	() => {
		let kernel: ReturnType<typeof activeConstantTimeKernel>;

		beforeAll(async () => {
			kernel = await createWasmConstantTimeKernel();
			installConstantTimeKernel(kernel);
		});

		constantTimeCase(
			"fixed vs random exponent",
			() => {
				kernel.modExp(
					base,
					fixedExponents[fixedExponentIndex++]!,
					modulusLimbs,
					rSquaredLimbs,
					n0inv,
					bits,
					words,
				);
			},
			() => {
				kernel.modExp(
					base,
					randomExponents[randomExponentIndex++]!,
					modulusLimbs,
					rSquaredLimbs,
					n0inv,
					bits,
					words,
				);
			},
		);
	},
);
