import { afterEach, expect, suite, test } from "vitest";

import { numericConfig } from "../globals.js";
import { OverflowError } from "../overflow-mode.js";
import { fixedSIntBigAbs } from "./fixed-sint-big-abs.js";
import { fixedSIntBigAdd } from "./fixed-sint-big-add.js";
import { fixedSIntBigDiv } from "./fixed-sint-big-div.js";
import { fixedSIntBigMax } from "./fixed-sint-big-max.js";
import { fixedSIntBigMin } from "./fixed-sint-big-min.js";
import { fixedSIntBigMul } from "./fixed-sint-big-mul.js";
import { fixedSIntBigNeg } from "./fixed-sint-big-neg.js";
import { fixedSIntBigPopCount } from "./fixed-sint-big-pop-count.js";
import { fixedSIntBigRem } from "./fixed-sint-big-rem.js";
import { fixedSIntBigShiftLeft } from "./fixed-sint-big-shift-left.js";
import { fixedSIntBigShiftRight } from "./fixed-sint-big-shift-right.js";
import { fixedSIntBigSub } from "./fixed-sint-big-sub.js";
import { fixedSIntBigToUnsigned } from "./fixed-sint-big-to-unsigned.js";
import { fixedSIntBigUnsignedShiftRight } from "./fixed-sint-big-unsigned-shift-right.js";

afterEach(() => {
	numericConfig.defaultOverflowMode = "wrap";
});

/** Operand spread covering both bounds, both signs and zero. */
const OPERANDS_8 = [-128n, -127n, -85n, -1n, 0n, 1n, 42n, 126n, 127n] as const;

suite("fixedSIntBig arithmetic", () => {
	// `Int8Array` performs the same truncation in the engine's own C++, so it
	// checks the wrap policy against something written by nobody here.
	test("wraps exactly as an Int8Array does", () => {
		const cell = new Int8Array(1);

		for (const left of OPERANDS_8) {
			for (const right of OPERANDS_8) {
				cell[0] = Number(left) + Number(right);
				expect(fixedSIntBigAdd(left, right, 8, "wrap")).toBe(BigInt(cell[0]!));

				cell[0] = Number(left) - Number(right);
				expect(fixedSIntBigSub(left, right, 8, "wrap")).toBe(BigInt(cell[0]!));

				cell[0] = Number(left) * Number(right);
				expect(fixedSIntBigMul(left, right, 8, "wrap")).toBe(BigInt(cell[0]!));
			}
		}
	});

	test("clamps to the bound the exact result passed", () => {
		expect(fixedSIntBigAdd(127n, 1n, 8, "clamp")).toBe(127n);
		expect(fixedSIntBigSub(-128n, 1n, 8, "clamp")).toBe(-128n);
		expect(fixedSIntBigMul(64n, 64n, 8, "clamp")).toBe(127n);
		expect(fixedSIntBigMul(-64n, 64n, 8, "clamp")).toBe(-128n);
	});

	test("clamps a product against the exact value, not a truncated one", () => {
		// 16n * 16n is 256n, whose low 8 bits are 0 — a hardware multiply that
		// clamped after truncating would answer 0 rather than the maximum.
		expect(fixedSIntBigMul(16n, 16n, 8, "clamp")).toBe(127n);
	});

	test("aborts on the operation that overflows, not the one before", () => {
		expect(fixedSIntBigAdd(126n, 1n, 8, "abort")).toBe(127n);
		expect(() => fixedSIntBigAdd(127n, 1n, 8, "abort")).toThrow(OverflowError);
	});
});

suite("fixedSIntBig negation", () => {
	test("overflows only at the minimum", () => {
		expect(fixedSIntBigNeg(127n, 8, "abort")).toBe(-127n);
		expect(fixedSIntBigAbs(-127n, 8, "abort")).toBe(127n);
		expect(() => fixedSIntBigNeg(-128n, 8, "abort")).toThrow(OverflowError);
		expect(() => fixedSIntBigAbs(-128n, 8, "abort")).toThrow(OverflowError);
	});

	test("wraps the minimum onto itself", () => {
		expect(fixedSIntBigNeg(-128n, 8, "wrap")).toBe(-128n);
		expect(fixedSIntBigAbs(-128n, 8, "wrap")).toBe(-128n);
	});

	test("clamps the minimum to the maximum", () => {
		expect(fixedSIntBigNeg(-128n, 8, "clamp")).toBe(127n);
	});
});

suite("fixedSIntBig division", () => {
	test("truncates toward zero, as C does", () => {
		expect(fixedSIntBigDiv(-7n, 2n, 8)).toBe(-3n);
		expect(fixedSIntBigDiv(7n, -2n, 8)).toBe(-3n);
		expect(fixedSIntBigRem(-7n, 2n)).toBe(-1n);
		expect(fixedSIntBigRem(7n, -2n)).toBe(1n);
	});

	test("overflows only for the minimum over -1", () => {
		expect(() => fixedSIntBigDiv(-128n, -1n, 8, "abort")).toThrow(
			OverflowError,
		);
		expect(fixedSIntBigDiv(-128n, -1n, 8, "wrap")).toBe(-128n);
		expect(fixedSIntBigDiv(-128n, -1n, 8, "clamp")).toBe(127n);
	});

	test("answers zero where C leaves the remainder undefined", () => {
		expect(fixedSIntBigRem(-128n, -1n)).toBe(0n);
	});

	test("throws on a zero divisor whatever the mode says", () => {
		expect(() => fixedSIntBigDiv(1n, 0n, 8, "wrap")).toThrow(RangeError);
		expect(() => fixedSIntBigDiv(1n, 0n, 8, "clamp")).toThrow(RangeError);
		expect(() => fixedSIntBigRem(1n, 0n)).toThrow(RangeError);
	});

	test("keeps every remainder in range, so it needs no policy", () => {
		for (const left of OPERANDS_8) {
			for (const right of OPERANDS_8) {
				if (right === 0n) {
					continue;
				}

				const remainder = fixedSIntBigRem(left, right);

				expect(remainder).toBeGreaterThanOrEqual(fixedSIntBigMin(8));
				expect(remainder).toBeLessThanOrEqual(fixedSIntBigMax(8));
			}
		}
	});
});

suite("fixedSIntBig shifts", () => {
	test("shift left wraps as an Int8Array does", () => {
		const cell = new Int8Array(1);

		for (const value of OPERANDS_8) {
			for (let count = 0; count < 8; count++) {
				cell[0] = Number(value) << count;
				expect(fixedSIntBigShiftLeft(value, count, 8, "wrap")).toBe(
					BigInt(cell[0]!),
				);
			}
		}
	});

	test("shift left past the width empties the value under wrap", () => {
		expect(fixedSIntBigShiftLeft(1n, 8, 8, "wrap")).toBe(0n);
		expect(fixedSIntBigShiftLeft(1n, 1000, 8, "wrap")).toBe(0n);
	});

	test("arithmetic shift right propagates the sign", () => {
		expect(fixedSIntBigShiftRight(-8n, 1)).toBe(-4n);
		expect(fixedSIntBigShiftRight(-1n, 1)).toBe(-1n);
		expect(fixedSIntBigShiftRight(-1n, 1000)).toBe(-1n);
		expect(fixedSIntBigShiftRight(8n, 1000)).toBe(0n);
	});

	test("logical shift right fills from the width's top bit", () => {
		expect(fixedSIntBigUnsignedShiftRight(-1n, 1, 8)).toBe(127n);
		expect(fixedSIntBigUnsignedShiftRight(-1n, 0, 8)).toBe(-1n);
		expect(fixedSIntBigUnsignedShiftRight(-1n, 8, 8)).toBe(0n);
		expect(fixedSIntBigUnsignedShiftRight(-2n, 1, 8)).toBe(127n);
	});

	test("logical shift right agrees with the native >>> at 32 bits", () => {
		// `Int32Array` reinterprets the unsigned result of `>>>` as signed, so the
		// whole oracle stays clear of `BigInt.asIntN` — which is what the subject
		// itself is built on.
		const cell = new Int32Array(1);

		for (const value of [-1n, -2147483648n, -12345n, 0n, 2147483647n]) {
			for (const count of [0, 1, 7, 31]) {
				cell[0] = Number(value) >>> count;

				expect(fixedSIntBigUnsignedShiftRight(value, count, 32)).toBe(
					BigInt(cell[0]!),
				);
			}
		}
	});

	test("rejects a negative count instead of shifting the other way", () => {
		expect(() => fixedSIntBigShiftLeft(1n, -1, 8)).toThrow(RangeError);
		expect(() => fixedSIntBigShiftRight(1n, -1)).toThrow(RangeError);
		expect(() => fixedSIntBigUnsignedShiftRight(1n, -1, 8)).toThrow(RangeError);
		expect(() => fixedSIntBigShiftLeft(1n, 1.5, 8)).toThrow(RangeError);
	});
});

suite("fixedSIntBig bit pattern", () => {
	test("reinterprets a negative value as its unsigned pattern", () => {
		expect(fixedSIntBigToUnsigned(-1n, 8)).toBe(255n);
		expect(fixedSIntBigToUnsigned(-128n, 8)).toBe(128n);
		expect(fixedSIntBigToUnsigned(127n, 8)).toBe(127n);
		expect(fixedSIntBigToUnsigned(0n, 8)).toBe(0n);
	});

	test("counts the pattern's bits rather than the magnitude's", () => {
		expect(fixedSIntBigPopCount(-1n, 8)).toBe(8);
		expect(fixedSIntBigPopCount(-1n, 64)).toBe(64);
		expect(fixedSIntBigPopCount(-128n, 8)).toBe(1);
		expect(fixedSIntBigPopCount(0n, 8)).toBe(0);
		expect(fixedSIntBigPopCount(127n, 8)).toBe(7);
	});
});
