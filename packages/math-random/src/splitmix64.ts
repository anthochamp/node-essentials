import { MASK_64N, type RandomFn } from "@ac-kit/core";

/**
 * Creates a seeded pseudo-random number generator function using the SplitMix64
 * algorithm by Guy Steele and Sebastiano Vigna. Single 64-bit state word,
 * 64-bit output.
 *
 * Commonly used to expand a single integer seed into an initial state for
 * multi-word generators such as xoshiro256+. Fast and passes BigCrush.
 *
 * The seed is accepted as a JS `number`; values above 2^53 may lose precision
 * due to IEEE 754 double representation before the BigInt conversion.
 *
 * @param seed - The seed value to initialize the 64-bit internal state.
 * @returns A function that generates pseudo-random numbers in the range [0, 1)
 *   when called.
 */
export function splitmix64(seed: number): RandomFn {
	let x = BigInt(seed) & MASK_64N;

	return () => {
		x = (x + 0x9e3779b97f4a7c15n) & MASK_64N;
		let z = x;
		z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK_64N;
		z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK_64N;
		return Number((z ^ (z >> 31n)) >> 11n) / 2 ** 53;
	};
}
