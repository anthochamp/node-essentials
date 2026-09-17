import { afterEach, expect, suite, test } from "vitest";

import { numericConfig } from "../globals.js";
import { OverflowError } from "../overflow-mode.js";
import { fixedSIntBigFrom } from "./fixed-sint-big-from.js";
import { fixedSIntBigIsInRange } from "./fixed-sint-big-is-in-range.js";
import { fixedSIntBigMax } from "./fixed-sint-big-max.js";
import { fixedSIntBigMin } from "./fixed-sint-big-min.js";
import { fixedUIntBigFrom } from "./fixed-uint-big-from.js";
import { fixedUIntBigIsInRange } from "./fixed-uint-big-is-in-range.js";
import { fixedUIntBigMax } from "./fixed-uint-big-max.js";

const WIDTHS = [1, 2, 8, 16, 32, 64, 128, 256] as const;

/**
 * The wrap stated as modular arithmetic rather than as bit truncation — no
 * shifts, no masks, no `BigInt.asIntN`. The implementation delegates to the
 * latter, so an oracle written in its terms would prove nothing.
 */
function wrapByModulus(
	value: bigint,
	bitWidth: number,
	signed: boolean,
): bigint {
	const span = 1n << BigInt(bitWidth);
	const remainder = value % span;
	const nonNegative = remainder < 0n ? remainder + span : remainder;

	return signed && nonNegative >= span / 2n ? nonNegative - span : nonNegative;
}

afterEach(() => {
	numericConfig.defaultOverflowMode = "wrap";
});

suite("bit width validation", () => {
	test("rejects a width that is not a non-negative integer", () => {
		for (const width of [-8, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(() => fixedSIntBigFrom(0n, width)).toThrow(RangeError);
			expect(() => fixedUIntBigFrom(0n, width)).toThrow(RangeError);
			expect(() => fixedSIntBigIsInRange(0n, width)).toThrow(RangeError);
			expect(() => fixedUIntBigIsInRange(0n, width)).toThrow(RangeError);
		}
	});

	test("leaves the range queries unguarded, having no value to admit", () => {
		expect(fixedUIntBigMax(0)).toBe(0n);
		expect(fixedSIntBigMin(0)).toBe(0n);
		expect(fixedSIntBigMax(0)).toBe(0n);
	});
});

suite("zero bits", () => {
	test("holds only zero, signed or not", () => {
		expect(fixedUIntBigIsInRange(0n, 0)).toBe(true);
		expect(fixedSIntBigIsInRange(0n, 0)).toBe(true);

		for (const value of [1n, -1n, 5n]) {
			expect(fixedUIntBigIsInRange(value, 0)).toBe(false);
			expect(fixedSIntBigIsInRange(value, 0)).toBe(false);
		}
	});

	test("fits every value to zero, whichever policy is asked for", () => {
		for (const value of [5n, -5n]) {
			expect(fixedUIntBigFrom(value, 0, "wrap")).toBe(0n);
			expect(fixedUIntBigFrom(value, 0, "clamp")).toBe(0n);
			expect(fixedSIntBigFrom(value, 0, "wrap")).toBe(0n);
			expect(fixedSIntBigFrom(value, 0, "clamp")).toBe(0n);
		}
	});

	test("aborts on anything but zero", () => {
		expect(fixedUIntBigFrom(0n, 0, "abort")).toBe(0n);
		expect(fixedSIntBigFrom(0n, 0, "abort")).toBe(0n);
		expect(() => fixedUIntBigFrom(1n, 0, "abort")).toThrow(OverflowError);
		expect(() => fixedSIntBigFrom(1n, 0, "abort")).toThrow(OverflowError);
	});
});

suite("ranges", () => {
	test("match the widths every platform integer type uses", () => {
		expect(fixedSIntBigMin(8)).toBe(-128n);
		expect(fixedSIntBigMax(8)).toBe(127n);
		expect(fixedUIntBigMax(8)).toBe(255n);
		expect(fixedSIntBigMin(32)).toBe(-2147483648n);
		expect(fixedSIntBigMax(32)).toBe(2147483647n);
		expect(fixedUIntBigMax(64)).toBe(18446744073709551615n);
	});

	test("hold exactly 2 ** bitWidth values, signed or not", () => {
		for (const width of WIDTHS) {
			const span = 1n << BigInt(width);

			expect(fixedSIntBigMax(width) - fixedSIntBigMin(width) + 1n).toBe(span);
			expect(fixedUIntBigMax(width) + 1n).toBe(span);
		}
	});

	test("degenerate at one bit rather than failing", () => {
		expect(fixedSIntBigMin(1)).toBe(-1n);
		expect(fixedSIntBigMax(1)).toBe(0n);
		expect(fixedUIntBigMax(1)).toBe(1n);
	});

	test("bound membership", () => {
		expect(fixedSIntBigIsInRange(-128n, 8)).toBe(true);
		expect(fixedSIntBigIsInRange(-129n, 8)).toBe(false);
		expect(fixedSIntBigIsInRange(127n, 8)).toBe(true);
		expect(fixedSIntBigIsInRange(128n, 8)).toBe(false);
		expect(fixedUIntBigIsInRange(0n, 8)).toBe(true);
		expect(fixedUIntBigIsInRange(-1n, 8)).toBe(false);
		expect(fixedUIntBigIsInRange(255n, 8)).toBe(true);
		expect(fixedUIntBigIsInRange(256n, 8)).toBe(false);
	});
});

suite("wrap", () => {
	test("is congruent modulo 2 ** bitWidth, and lands in range", () => {
		for (const width of WIDTHS) {
			for (const value of [
				0n,
				1n,
				-1n,
				7n,
				-7n,
				1n << BigInt(width),
				(1n << BigInt(width)) - 1n,
				-(1n << BigInt(width)),
				(3n << BigInt(width)) + 5n,
				-((3n << BigInt(width)) + 5n),
				12345678901234567890n,
				-12345678901234567890n,
			]) {
				const signed = fixedSIntBigFrom(value, width, "wrap");
				const unsigned = fixedUIntBigFrom(value, width, "wrap");

				expect(signed).toBe(wrapByModulus(value, width, true));
				expect(unsigned).toBe(wrapByModulus(value, width, false));
				expect(fixedSIntBigIsInRange(signed, width)).toBe(true);
				expect(fixedUIntBigIsInRange(unsigned, width)).toBe(true);
			}
		}
	});

	test("leaves an in-range value untouched", () => {
		expect(fixedSIntBigFrom(42n, 8, "wrap")).toBe(42n);
		expect(fixedUIntBigFrom(42n, 8, "wrap")).toBe(42n);
	});
});

suite("clamp", () => {
	test("saturates at the nearer bound", () => {
		expect(fixedSIntBigFrom(1000n, 8, "clamp")).toBe(127n);
		expect(fixedSIntBigFrom(-1000n, 8, "clamp")).toBe(-128n);
		expect(fixedUIntBigFrom(1000n, 8, "clamp")).toBe(255n);
		expect(fixedUIntBigFrom(-1n, 8, "clamp")).toBe(0n);
	});

	test("is idempotent", () => {
		const once = fixedSIntBigFrom(1000n, 8, "clamp");

		expect(fixedSIntBigFrom(once, 8, "clamp")).toBe(once);
	});
});

suite("abort", () => {
	test("throws an OverflowError naming the width", () => {
		expect(() => fixedSIntBigFrom(128n, 8, "abort")).toThrow(OverflowError);
		expect(() => fixedSIntBigFrom(128n, 8, "abort")).toThrow(/8-bit signed/);
		expect(() => fixedUIntBigFrom(-1n, 8, "abort")).toThrow(/8-bit unsigned/);
	});

	test("passes an in-range value through without throwing", () => {
		expect(fixedSIntBigFrom(-128n, 8, "abort")).toBe(-128n);
		expect(fixedUIntBigFrom(255n, 8, "abort")).toBe(255n);
	});
});

suite("default mode", () => {
	test("comes from numericConfig, at every width alike", () => {
		numericConfig.defaultOverflowMode = "clamp";

		for (const width of [8, 64, 128]) {
			expect(fixedSIntBigFrom(1n << 200n, width)).toBe(fixedSIntBigMax(width));
			expect(fixedUIntBigFrom(-1n, width)).toBe(0n);
		}
	});

	test("is read on each call rather than captured", () => {
		expect(fixedUIntBigFrom(-1n, 8)).toBe(255n);

		numericConfig.defaultOverflowMode = "abort";

		expect(() => fixedUIntBigFrom(-1n, 8)).toThrow(OverflowError);
	});

	test("is overridden by an explicit mode", () => {
		numericConfig.defaultOverflowMode = "abort";

		expect(fixedUIntBigFrom(-1n, 8, "wrap")).toBe(255n);
	});
});
