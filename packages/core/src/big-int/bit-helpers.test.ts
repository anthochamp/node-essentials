import { describe, expect, it } from "vitest";

import { bigIntPopCount } from "./bit/pop-count.js";
import { shiftRightUnsigned64 } from "./bit/shift-right-unsigned64.js";

describe("bigIntPopCount", () => {
	it("counts across any width", () => {
		expect(bigIntPopCount(0n)).toBe(0);
		expect(bigIntPopCount(1n)).toBe(1);
		expect(bigIntPopCount(0xffn)).toBe(8);
		expect(bigIntPopCount(2n ** 200n)).toBe(1);
		expect(bigIntPopCount(2n ** 200n - 1n)).toBe(200);
	});

	it("counts the magnitude, not a two's complement pattern", () => {
		expect(bigIntPopCount(-0xffn)).toBe(8);
	});

	it("agrees with a per-bit loop", () => {
		for (const value of [123n, 2n ** 64n, 2n ** 65n - 3n, 10n ** 30n]) {
			let count = 0;

			for (let rest = value; rest > 0n; rest >>= 1n) {
				count += Number(rest & 1n);
			}

			expect(bigIntPopCount(value)).toBe(count);
		}
	});
});

describe("shiftRightUnsigned64", () => {
	it("shifts in zeros where `>>` would shift in ones", () => {
		expect(shiftRightUnsigned64(-1n, 60)).toBe(0xfn);
		expect(-1n >> 60n).toBe(-1n);
	});

	it("matches the unsigned shift on a positive word", () => {
		expect(shiftRightUnsigned64(0xff00n, 8)).toBe(0xffn);
	});

	it("clears the word at 64 or more", () => {
		expect(shiftRightUnsigned64(-1n, 64)).toBe(0n);
		expect(shiftRightUnsigned64(-1n, 500)).toBe(0n);
	});

	it("masks to 64 bits even for a zero shift", () => {
		expect(shiftRightUnsigned64(2n ** 70n + 5n, 0)).toBe(5n);
	});
});
