/**
 * Differential tests against the hardware.
 *
 * Binary16, binary32 and binary64 all exist as typed arrays in the runtime, so
 * every one of them is a correctly-rounded oracle that costs nothing to
 * consult. Storing into a `Float32Array` rounds to binary32 exactly as the FPU
 * would, and the same holds for `Float16Array`. There is no need for external
 * vectors to check three of the four formats.
 *
 * Binary128 has no oracle here. It shares one code path with the other three,
 * so correctness for those is the evidence for it.
 */

import { xorshift32 } from "@ac-kit/math-random";
import { describe, expect, it } from "vitest";

import {
	IEEE_FORMAT_BINARY16,
	IEEE_FORMAT_BINARY32,
	IEEE_FORMAT_BINARY64,
	IeeeFormat,
} from "../../../ieee-format.js";
import { packFromBigInt } from "../../_pack-from-big-int.js";
import { ieeeBinaryAdd } from "../../ieee-binary-add.js";
import { ieeeBinaryFromNumber } from "../../ieee-binary-from-number.js";
import { ieeeBinarySqrt } from "../../ieee-binary-sqrt.js";
import { div } from "./_div.js";
import { mul } from "./_mul.js";

type Oracle = {
	readonly format: IeeeFormat;
	readonly name: string;

	/** Rounds a binary64 value into the format, as the hardware would. */
	round(value: number): number;

	/** The format's packed bit pattern for a value, as a hex string. */
	bits(value: number): string;
};

const f16 = new Float16Array(1);
const f16Bits = new Uint16Array(f16.buffer);
const f32 = new Float32Array(1);
const f32Bits = new Uint32Array(f32.buffer);
const f64 = new Float64Array(1);
const f64Bits = new BigUint64Array(f64.buffer);

const ORACLES: readonly Oracle[] = [
	{
		format: IEEE_FORMAT_BINARY16,
		name: "binary16",
		round: (value) => {
			f16[0] = value;

			return f16[0]!;
		},
		bits: (value) => {
			f16[0] = value;

			return f16Bits[0]!.toString(16).padStart(4, "0");
		},
	},
	{
		format: IEEE_FORMAT_BINARY32,
		name: "binary32",
		round: (value) => {
			f32[0] = value;

			return f32[0]!;
		},
		bits: (value) => {
			f32[0] = value;

			return f32Bits[0]!.toString(16).padStart(8, "0");
		},
	},
	{
		format: IEEE_FORMAT_BINARY64,
		name: "binary64",
		round: (value) => value,
		bits: (value) => {
			f64[0] = value;

			return f64Bits[0]!.toString(16).padStart(16, "0");
		},
	},
];

/** The soft-float result's packed bit pattern, as the same hex string. */
function softBits(words: Uint32Array, format: IeeeFormat): string {
	let value = 0n;

	for (let index = words.length - 1; index >= 0; index--) {
		value = (value << 32n) | BigInt(words[index]!);
	}

	return value.toString(16).padStart(format.k / 4, "0");
}

/** True when the bit pattern is any NaN: exponent all ones, payload non-zero. */
function isNaNBits(hex: string, format: IeeeFormat): boolean {
	const value = BigInt(`0x${hex}`);
	const trailing = format.p - 1;
	const exponentBits = format.k - trailing - 1;
	const exponent =
		(value >> BigInt(trailing)) & ((1n << BigInt(exponentBits)) - 1n);
	const payload = value & ((1n << BigInt(trailing)) - 1n);

	return exponent === (1n << BigInt(exponentBits)) - 1n && payload !== 0n;
}

function apply(
	operation: "add" | "mul" | "div",
	a: number,
	b: number,
	format: IeeeFormat,
): Uint32Array {
	const left = ieeeBinaryFromNumber(a, format);
	const right = ieeeBinaryFromNumber(b, format);

	switch (operation) {
		case "add":
			return packFromBigInt(ieeeBinaryAdd(left, right, format), format);
		case "mul":
			return packFromBigInt(mul(left, right, format), format);
		case "div":
			return packFromBigInt(div(left, right, format), format);
	}
}

/** Values chosen to exercise carries, cancellation and the exponent range. */
const OPERANDS: readonly number[] = [
	0,
	1,
	2,
	3,
	0.5,
	1.5,
	-1,
	-2,
	-0.5,
	7,
	10,
	100,
	1024,
	0.1,
	0.25,
	1 / 3,

	// Ties, so the rounding mode is exercised rather than assumed.
	2.5,
	3.5,
	-2.5,

	// Subnormal and near-subnormal for each format. The narrower formats flush
	// the wider ones' values to zero, which is itself worth checking.
	5.960464477539063e-8,
	1.1754943508222875e-38,
	5e-324,
	2.2250738585072014e-308,

	// The top of each format's range, to reach overflow to infinity.
	65504,
	3.4028234663852886e38,
	1.7976931348623157e308,
];

/** A deterministic generator, so a failure is reproducible. */
function* randomPairs(count: number): Generator<[number, number]> {
	const rand = xorshift32(0x2545f491);

	const next = () => rand();

	for (let index = 0; index < count; index++) {
		// Spread over several binades so carries and cancellation both occur.
		const scale = 2 ** Math.trunc(next() * 20 - 10);

		yield [(next() * 2 - 1) * scale, (next() * 2 - 1) * scale];
	}
}

describe.each(ORACLES)("$name soft float", (oracle) => {
	const { format, round, bits } = oracle;

	const check = (
		operation: "add" | "mul" | "div",
		rawA: number,
		rawB: number,
	): void => {
		const a = round(rawA);
		const b = round(rawB);
		const expected =
			operation === "add" ? a + b : operation === "mul" ? a * b : a / b;

		const actual = softBits(apply(operation, a, b, format), format);

		// A NaN's sign and payload are implementation-defined, so only its
		// NaN-ness is comparable.
		if (Number.isNaN(expected)) {
			expect(isNaNBits(actual, format), `${a} ${operation} ${b}`).toBe(true);

			return;
		}

		expect(actual, `${a} ${operation} ${b}`).toBe(bits(expected));
	};

	it("round-trips a value through pack and unpack", () => {
		for (const value of OPERANDS) {
			const rounded = round(value);

			expect(
				softBits(
					packFromBigInt(ieeeBinaryFromNumber(rounded, format), format),
					format,
				),
				`${rounded}`,
			).toBe(bits(rounded));
		}
	});

	it.each(["add", "mul", "div"] as const)(
		"matches the hardware for %s on chosen operands",
		(operation) => {
			for (const a of OPERANDS) {
				for (const b of OPERANDS) {
					if (operation === "div" && round(b) === 0) {
						continue;
					}

					check(operation, a, b);
				}
			}
		},
	);

	it.each(["add", "mul", "div"] as const)(
		"matches the hardware for %s on random operands",
		(operation) => {
			for (const [a, b] of randomPairs(5000)) {
				if (operation === "div" && round(b) === 0) {
					continue;
				}

				check(operation, a, b);
			}
		},
	);

	it("matches the hardware for sqrt", () => {
		for (const value of OPERANDS) {
			const operand = round(Math.abs(value));
			const result = packFromBigInt(
				ieeeBinarySqrt(ieeeBinaryFromNumber(operand, format), format),
				format,
			);

			expect(softBits(result, format), `sqrt(${operand})`).toBe(
				bits(round(Math.sqrt(operand))),
			);
		}
	});
});
