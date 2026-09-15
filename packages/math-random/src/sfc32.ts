import { rotl32, type RandomFn } from "@ac-kit/core";

/**
 * Creates a seeded pseudo-random number generator function using the SFC32
 * algorithm (Small Fast Counting, 32-bit output) by Chris Doty-Humphrey.
 *
 * Uses 128-bit state (four 32-bit words) and an internal counter for guaranteed
 * long periods. Passes PractRand at very high lengths.
 *
 * @param a - First seed word (32-bit unsigned integer).
 * @param b - Second seed word (32-bit unsigned integer).
 * @param c - Third seed word (32-bit unsigned integer).
 * @param d - Counter word (32-bit unsigned integer); start at 0 or any value.
 * @returns A function that generates pseudo-random numbers in the range [0, 1)
 *   when called.
 */
export function sfc32(a: number, b: number, c: number, d: number): RandomFn {
	a = a >>> 0;
	b = b >>> 0;
	c = c >>> 0;
	d = d >>> 0;
	return () => {
		const t = (a + b) | 0;
		a = b ^ (b >>> 9);
		b = (c + (c << 3)) | 0;
		c = rotl32(c, 21);
		d = (d + 1) | 0;
		const result = (t + d) | 0;
		c = (c + result) | 0;
		return (result >>> 0) / 4294967296;
	};
}
