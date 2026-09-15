/**
 * Correctness of the WASM kernel's limb-native significand path
 * (`sfPackLimbs`/`sfUnpackLimbs`/`sig-convert.ts`) against the portable
 * `bigint` path it must agree with bit-for-bit — same convention, same
 * rounding, different storage only.
 */

import { wordsForBits } from "@ac-kit/core";
import { limb32FromBigInt, limb32ToBigInt } from "@ac-kit/math-integer";
import { xorshift32 } from "@ac-kit/math-random";
import { describe, expect, it } from "vitest";

import {
	IEEE_FORMAT_BINARY128,
	IEEE_FORMAT_BINARY16,
	IEEE_FORMAT_BINARY32,
	IEEE_FORMAT_BINARY64,
	IeeeFormat,
} from "../ieee-format.js";
import { finiteToBigInt } from "./_finite-to-big-int.js";
import { finiteToLimbs } from "./_finite-to-limbs.js";
import { packFromBigInt } from "./_pack-from-big-int.js";
import { packFromLimbs } from "./_pack-from-limbs.js";
import { unpackToBigInt } from "./_unpack-to-big-int.js";
import { unpackToLimbs } from "./_unpack-to-limbs.js";
import { ieeeBinaryFromNumber } from "./ieee-binary-from-number.js";
import { IeeeBinaryFinite } from "./ieee-binary-types.js";

const FORMATS: readonly { name: string; format: IeeeFormat }[] = [
	{ name: "binary16", format: IEEE_FORMAT_BINARY16 },
	{ name: "binary32", format: IEEE_FORMAT_BINARY32 },
	{ name: "binary64", format: IEEE_FORMAT_BINARY64 },
	{ name: "binary128", format: IEEE_FORMAT_BINARY128 },
];

const EDGE_CASE_VALUES: readonly number[] = [
	0,
	-0,
	1,
	-1,
	2,
	0.5,
	1.5,
	7,
	10,
	0.1,
	1 / 3,
	2.5,
	100.25,
	1e-10,
	1e10,
	Infinity,
	-Infinity,
	NaN,
];

function randomDoubles(count: number, seed: number): number[] {
	const rand = xorshift32(seed);
	const values: number[] = [];

	for (let i = 0; i < count; i++) {
		const scale = 2 ** Math.trunc(rand() * 40 - 20);
		values.push((rand() * 2 - 1) * scale);
	}

	return values;
}

describe("sig-convert: bigint <=> limbs", () => {
	it("round-trips arbitrary bigints through limbs", () => {
		const rand = xorshift32(42);

		for (const limbWords of [1, 2, 4, 8]) {
			for (let i = 0; i < 200; i++) {
				const maxBits = limbWords * 32;
				const bits = Math.floor(rand() * maxBits);
				const value =
					BigInt(Math.floor(rand() * Number.MAX_SAFE_INTEGER)) &
					((1n << BigInt(Math.min(bits, 53))) - 1n);

				const limbs = limb32FromBigInt(value, limbWords);
				expect(limb32ToBigInt(limbs)).toBe(value);
			}
		}
	});

	it("sfFiniteAsBigInt/sfFiniteAsLimbs are identity when already the right shape", () => {
		const bigintSf: IeeeBinaryFinite<bigint> = {
			kind: "finite",
			sign: 0,
			exp: 3,
			sig: 123n,
		};
		expect(finiteToBigInt(bigintSf)).toBe(bigintSf);

		const limbSf: IeeeBinaryFinite<Uint32Array> = {
			kind: "finite",
			sign: 0,
			exp: 3,
			sig: new Uint32Array([123]),
		};
		expect(finiteToLimbs(limbSf, 1)).toBe(limbSf);
	});

	it("converts between representations without changing the value", () => {
		const bigintSf: IeeeBinaryFinite<bigint> = {
			kind: "finite",
			sign: 1,
			exp: -5,
			sig: (1n << 52n) | 0x123456789abcn,
		};

		const asLimbs = finiteToLimbs(bigintSf, 2);
		expect(asLimbs.sig).toBeInstanceOf(Uint32Array);

		const roundTripped = finiteToBigInt(asLimbs);
		expect(roundTripped.sig).toBe(bigintSf.sig);
		expect(roundTripped.sign).toBe(bigintSf.sign);
		expect(roundTripped.exp).toBe(bigintSf.exp);
	});
});

describe("packFromLimbs/unpackToLimbs agree with packFromBigInt/unpackToBigInt", () => {
	for (const { name, format } of FORMATS) {
		describe(name, () => {
			const values = [...EDGE_CASE_VALUES, ...randomDoubles(300, 0x2545f491)];

			it.each(values)("unpack+pack round-trip for %s", (value) => {
				const words = packFromBigInt(
					ieeeBinaryFromNumber(value, format),
					format,
				);

				const bigintResult = unpackToBigInt(words, format);
				const limbResult = unpackToLimbs(words, format);

				// Same logical value, regardless of sig representation.
				expect(limbResult.kind).toBe(bigintResult.kind);
				if (bigintResult.kind === "finite" && limbResult.kind === "finite") {
					const limbAsBigInt = finiteToBigInt(limbResult);
					expect(limbAsBigInt.sig).toBe(bigintResult.sig);
					expect(limbAsBigInt.sign).toBe(bigintResult.sign);
					expect(limbAsBigInt.exp).toBe(bigintResult.exp);
				}

				// Re-packing either representation must reproduce the same bits.
				const packedFromBigint = packFromBigInt(bigintResult, format);
				const packedFromLimbs = packFromLimbs(limbResult, format);
				expect([...packedFromLimbs]).toEqual([...packedFromBigint]);
			});

			it("packs a bigint-sourced value converted to limbs identically", () => {
				for (const value of EDGE_CASE_VALUES) {
					const bigintResult = ieeeBinaryFromNumber(value, format);
					const asLimbs =
						bigintResult.kind === "finite"
							? finiteToLimbs(bigintResult, wordsForBits(format.p, 32))
							: bigintResult;

					expect([...packFromLimbs(asLimbs, format)]).toEqual([
						...packFromBigInt(bigintResult, format),
					]);
				}
			});
		});
	}
});
