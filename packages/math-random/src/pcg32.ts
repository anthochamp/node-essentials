import { MASK_64N, rotr32, type RandomFn } from "@ac-kit/core";

/**
 * Creates a seeded pseudo-random number generator function using the PCG32
 * algorithm (Permuted Congruential Generator, 32-bit output) by Melissa O'Neill
 * (2014).
 *
 * Uses a 64-bit LCG state with a scrambled output function. Excellent
 * statistical quality.
 *
 * The seed is accepted as a JS `number`; values above 2^53 may lose precision
 * due to IEEE 754 double representation before the BigInt conversion.
 *
 * @param seed - The seed value to initialize the 64-bit internal state.
 * @returns A function that generates pseudo-random numbers in the range [0, 1)
 *   when called.
 */
export function pcg32(seed: number): RandomFn {
	let state = BigInt(seed) & MASK_64N;
	const multiplier = 6364136223846793005n;
	const increment = 1442695040888963407n;

	return () => {
		state = (state * multiplier + increment) & MASK_64N;
		const xorshifted = Number(((state >> 18n) ^ state) >> 27n) | 0;
		const rot = Number(state >> 59n);
		return rotr32(xorshifted, rot) / 4294967296;
	};
}
