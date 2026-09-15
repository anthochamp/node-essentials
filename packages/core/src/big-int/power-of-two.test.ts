import { expect, suite, test } from "vitest";

import {
	bigIntIsPowerOfTwo,
	bigIntNextPowerOfTwo,
	bigIntPreviousPowerOfTwo,
} from "./power-of-two.js";

suite("BigInt Power of Two", () => {
	test("bigIntIsPowerOfTwo", () => {
		expect(() => bigIntIsPowerOfTwo(-1n)).toThrow(RangeError);
		expect(bigIntIsPowerOfTwo(0n)).toBe(false);
		expect(bigIntIsPowerOfTwo(1n)).toBe(true);
		expect(bigIntIsPowerOfTwo(2n)).toBe(true);
		expect(bigIntIsPowerOfTwo(3n)).toBe(false);
		expect(bigIntIsPowerOfTwo(4n)).toBe(true);
		expect(bigIntIsPowerOfTwo(65536n)).toBe(true);
		expect(bigIntIsPowerOfTwo(2n ** 32n - 1n)).toBe(false);
		expect(bigIntIsPowerOfTwo(2n ** 32n)).toBe(true);
		expect(bigIntIsPowerOfTwo(2n ** 52n)).toBe(true);
		expect(bigIntIsPowerOfTwo(2n ** 52n + 1n)).toBe(false);
		expect(bigIntIsPowerOfTwo(2n ** 52n + 2n)).toBe(false);
		expect(bigIntIsPowerOfTwo(2n ** 53n)).toBe(true);
		expect(bigIntIsPowerOfTwo(2n ** 53n + 1n)).toBe(false);
		expect(bigIntIsPowerOfTwo(2n ** 53n + 2n)).toBe(false);
		expect(bigIntIsPowerOfTwo(2n ** 54n)).toBe(true);
		expect(bigIntIsPowerOfTwo(2n ** 54n + 1n)).toBe(false);
		expect(bigIntIsPowerOfTwo(2n ** 55n)).toBe(true);
		expect(bigIntIsPowerOfTwo(2n ** 10000n)).toBe(true);
		expect(bigIntIsPowerOfTwo(2n ** 10000n + 1n)).toBe(false);
	});

	test("bigIntNextPowerOfTwo", () => {
		expect(() => bigIntNextPowerOfTwo(-1n)).toThrow(RangeError);
		expect(bigIntNextPowerOfTwo(0n)).toBe(1n);
		expect(bigIntNextPowerOfTwo(1n)).toBe(1n);
		expect(bigIntNextPowerOfTwo(2n)).toBe(2n);
		expect(bigIntNextPowerOfTwo(3n)).toBe(4n);
		expect(bigIntNextPowerOfTwo(5n)).toBe(8n);
		expect(bigIntNextPowerOfTwo(2n ** 52n - 1n)).toBe(2n ** 52n);
		expect(bigIntNextPowerOfTwo(2n ** 52n)).toBe(2n ** 52n);
		expect(bigIntNextPowerOfTwo(2n ** 52n + 1n)).toBe(2n ** 53n);
		expect(bigIntNextPowerOfTwo(2n ** 10000n)).toBe(2n ** 10000n);
		expect(bigIntNextPowerOfTwo(2n ** 10000n + 1n)).toBe(2n ** 10001n);
	});

	test("bigIntPreviousPowerOfTwo", () => {
		expect(() => bigIntPreviousPowerOfTwo(-1n)).toThrow(RangeError);
		expect(() => bigIntPreviousPowerOfTwo(0n)).toThrow(RangeError);
		expect(bigIntPreviousPowerOfTwo(1n)).toBe(1n);
		expect(bigIntPreviousPowerOfTwo(2n)).toBe(2n);
		expect(bigIntPreviousPowerOfTwo(3n)).toBe(2n);
		expect(bigIntPreviousPowerOfTwo(5n)).toBe(4n);
		expect(bigIntPreviousPowerOfTwo(2n ** 52n - 1n)).toBe(2n ** 51n);
		expect(bigIntPreviousPowerOfTwo(2n ** 52n)).toBe(2n ** 52n);
		expect(bigIntPreviousPowerOfTwo(2n ** 52n + 1n)).toBe(2n ** 52n);
		expect(bigIntPreviousPowerOfTwo(2n ** 10000n - 1n)).toBe(2n ** 9999n);
		expect(bigIntPreviousPowerOfTwo(2n ** 10000n)).toBe(2n ** 10000n);
		expect(bigIntPreviousPowerOfTwo(2n ** 10000n + 1n)).toBe(2n ** 10000n);
	});
});
