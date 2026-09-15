import { expect, suite, test } from "vitest";

import {
	isPowerOfTwo,
	nextPowerOfTwo,
	previousPowerOfTwo,
} from "./power-of-two.js";

suite("Power of Two", () => {
	test("isPowerOfTwo", () => {
		expect(() => isPowerOfTwo(-1)).toThrow(RangeError);
		expect(isPowerOfTwo(0)).toBe(false);
		expect(isPowerOfTwo(1)).toBe(true);
		expect(isPowerOfTwo(2)).toBe(true);
		expect(isPowerOfTwo(3)).toBe(false);
		expect(isPowerOfTwo(4)).toBe(true);
		expect(isPowerOfTwo(2 ** 16)).toBe(true);
		expect(isPowerOfTwo(2 ** 32 - 1)).toBe(false);
		expect(isPowerOfTwo(2 ** 32)).toBe(true);
		expect(isPowerOfTwo(2 ** 52)).toBe(true);
		expect(isPowerOfTwo(2 ** 52 + 1)).toBe(false);
		expect(isPowerOfTwo(2 ** 52 + 2)).toBe(false);
		expect(isPowerOfTwo(2 ** 53 - 1)).toBe(false);
		expect(isPowerOfTwo(2 ** 53)).toBe(null);
	});

	test("nextPowerOfTwo", () => {
		expect(() => nextPowerOfTwo(-1)).toThrow(RangeError);
		expect(nextPowerOfTwo(0)).toBe(1);
		expect(nextPowerOfTwo(1)).toBe(1);
		expect(nextPowerOfTwo(2)).toBe(2);
		expect(nextPowerOfTwo(3)).toBe(4);
		expect(nextPowerOfTwo(4)).toBe(4);
		expect(nextPowerOfTwo(2 ** 16 - 1)).toBe(2 ** 16);
		expect(nextPowerOfTwo(2 ** 16 + 1)).toBe(2 ** 17);
		expect(nextPowerOfTwo(2 ** 52 - 1)).toBe(2 ** 52);
		expect(nextPowerOfTwo(2 ** 52)).toBe(2 ** 52);
		expect(nextPowerOfTwo(2 ** 52 + 1)).toBe(null);
		expect(nextPowerOfTwo(2 ** 53 - 1)).toBe(null);
		expect(nextPowerOfTwo(2 ** 53)).toBe(null);
	});

	test("previousPowerOfTwo", () => {
		expect(() => previousPowerOfTwo(-1)).toThrow(RangeError);
		expect(() => previousPowerOfTwo(0)).toThrow(RangeError);
		expect(previousPowerOfTwo(1)).toBe(1);
		expect(previousPowerOfTwo(2)).toBe(2);
		expect(previousPowerOfTwo(3)).toBe(2);
		expect(previousPowerOfTwo(4)).toBe(4);
		expect(previousPowerOfTwo(2 ** 16 - 1)).toBe(2 ** 15);
		expect(previousPowerOfTwo(2 ** 16 + 1)).toBe(2 ** 16);
		expect(previousPowerOfTwo(2 ** 51 - 1)).toBe(2 ** 50);
		expect(previousPowerOfTwo(2 ** 51 + 1)).toBe(2 ** 51);
		expect(previousPowerOfTwo(2 ** 52 - 1)).toBe(2 ** 51);
		expect(previousPowerOfTwo(2 ** 52)).toBe(2 ** 52);
		expect(previousPowerOfTwo(2 ** 52 + 1)).toBe(2 ** 52);
		expect(previousPowerOfTwo(2 ** 53 - 1)).toBe(2 ** 52);
		expect(previousPowerOfTwo(2 ** 53)).toBe(null);
	});
});
