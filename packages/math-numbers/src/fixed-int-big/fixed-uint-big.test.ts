import { afterEach, expect, suite, test } from "vitest";

import { numericConfig } from "../globals.js";
import { OverflowError } from "../overflow-mode.js";
import { fixedUIntBigAdd } from "./fixed-uint-big-add.js";
import { fixedUIntBigMul } from "./fixed-uint-big-mul.js";
import { fixedUIntBigNeg } from "./fixed-uint-big-neg.js";
import { fixedUIntBigNot } from "./fixed-uint-big-not.js";
import { fixedUIntBigShiftLeft } from "./fixed-uint-big-shift-left.js";
import { fixedUIntBigShiftRight } from "./fixed-uint-big-shift-right.js";
import { fixedUIntBigSub } from "./fixed-uint-big-sub.js";
import { fixedUIntBigToSigned } from "./fixed-uint-big-to-signed.js";

afterEach(() => {
	numericConfig.defaultOverflowMode = "wrap";
});

const OPERANDS_8 = [0n, 1n, 42n, 127n, 128n, 200n, 254n, 255n] as const;

suite("fixedUIntBig arithmetic", () => {
	// `Uint8Array` performs the same truncation in the engine's own C++.
	test("wraps exactly as a Uint8Array does", () => {
		const cell = new Uint8Array(1);

		for (const left of OPERANDS_8) {
			for (const right of OPERANDS_8) {
				cell[0] = Number(left) + Number(right);
				expect(fixedUIntBigAdd(left, right, 8, "wrap")).toBe(BigInt(cell[0]!));

				cell[0] = Number(left) - Number(right);
				expect(fixedUIntBigSub(left, right, 8, "wrap")).toBe(BigInt(cell[0]!));

				cell[0] = Number(left) * Number(right);
				expect(fixedUIntBigMul(left, right, 8, "wrap")).toBe(BigInt(cell[0]!));
			}
		}
	});

	test("clamps at zero rather than borrowing", () => {
		expect(fixedUIntBigSub(3n, 5n, 8, "clamp")).toBe(0n);
		expect(fixedUIntBigAdd(255n, 1n, 8, "clamp")).toBe(255n);
		expect(fixedUIntBigMul(16n, 16n, 8, "clamp")).toBe(255n);
	});

	test("aborts on an underflow, which is the common unsigned failure", () => {
		expect(fixedUIntBigSub(5n, 5n, 8, "abort")).toBe(0n);
		expect(() => fixedUIntBigSub(3n, 5n, 8, "abort")).toThrow(OverflowError);
	});
});

suite("fixedUIntBig negation", () => {
	test("is the two's-complement negation under wrap", () => {
		expect(fixedUIntBigNeg(1n, 8, "wrap")).toBe(255n);
		expect(fixedUIntBigNeg(255n, 8, "wrap")).toBe(1n);
		expect(fixedUIntBigNeg(0n, 8, "wrap")).toBe(0n);
	});

	test("is its own inverse under wrap", () => {
		for (const value of OPERANDS_8) {
			expect(
				fixedUIntBigNeg(fixedUIntBigNeg(value, 8, "wrap"), 8, "wrap"),
			).toBe(value);
		}
	});

	test("overflows for every non-zero value under abort", () => {
		expect(fixedUIntBigNeg(0n, 8, "abort")).toBe(0n);
		expect(() => fixedUIntBigNeg(1n, 8, "abort")).toThrow(OverflowError);
	});
});

suite("fixedUIntBig bitwise", () => {
	test("complement stays inside the width", () => {
		expect(fixedUIntBigNot(0n, 8)).toBe(255n);
		expect(fixedUIntBigNot(255n, 8)).toBe(0n);
		expect(fixedUIntBigNot(0b1010_1010n, 8)).toBe(0b0101_0101n);
	});

	test("complement is its own inverse", () => {
		for (const width of [1, 8, 32, 64]) {
			for (const value of OPERANDS_8) {
				const inside = value & ((1n << BigInt(width)) - 1n);

				expect(fixedUIntBigNot(fixedUIntBigNot(inside, width), width)).toBe(
					inside,
				);
			}
		}
	});

	test("shift left wraps as a Uint8Array does", () => {
		const cell = new Uint8Array(1);

		for (const value of OPERANDS_8) {
			for (let count = 0; count < 8; count++) {
				cell[0] = Number(value) << count;
				expect(fixedUIntBigShiftLeft(value, count, 8, "wrap")).toBe(
					BigInt(cell[0]!),
				);
			}
		}
	});

	test("shift right fills with zeros and saturates at zero", () => {
		expect(fixedUIntBigShiftRight(255n, 1)).toBe(127n);
		expect(fixedUIntBigShiftRight(255n, 8)).toBe(0n);
		expect(fixedUIntBigShiftRight(255n, 1000)).toBe(0n);
	});

	test("rejects a negative count instead of shifting the other way", () => {
		expect(() => fixedUIntBigShiftLeft(1n, -1, 8)).toThrow(RangeError);
		expect(() => fixedUIntBigShiftRight(1n, -1)).toThrow(RangeError);
	});
});

suite("fixedUIntBig reinterpretation", () => {
	test("reads the top half as negative", () => {
		expect(fixedUIntBigToSigned(255n, 8)).toBe(-1n);
		expect(fixedUIntBigToSigned(128n, 8)).toBe(-128n);
		expect(fixedUIntBigToSigned(127n, 8)).toBe(127n);
		expect(fixedUIntBigToSigned(0n, 8)).toBe(0n);
	});

	test("is the documented top-half rule at every width", () => {
		for (const width of [1, 8, 16, 32, 64]) {
			const span = 1n << BigInt(width);

			for (const value of [0n, 1n, 255n, 65535n, 12345678901234567890n]) {
				const pattern = ((value % span) + span) % span;
				const expected = pattern >= span / 2n ? pattern - span : pattern;

				expect(fixedUIntBigToSigned(pattern, width)).toBe(expected);
			}
		}
	});
});
