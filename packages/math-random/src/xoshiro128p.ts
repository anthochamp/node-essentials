import { rotl32, type RandomFn } from "@ac-kit/core";

/**
 * Creates a seeded pseudo-random number generator function using the
 * xoshiro128+ algorithm by Blackman & Vigna (2018). 128-bit state, 32-bit
 * output.
 *
 * Recommended for floating-point generation. Passes PractRand. Faster than the
 * `**` variant.
 *
 * @param seed - The seed value used to derive the four 32-bit state words.
 * @returns A function that generates pseudo-random numbers in the range [0, 1)
 *   when called.
 */
export function xoshiro128p(seed: number): RandomFn {
	let s0 = seed >>> 0;
	let s1 = (seed ^ 0x6d2b79f5) >>> 0;
	let s2 = (seed ^ 0x9e3779b9) >>> 0;
	let s3 = (seed ^ 0x7f4a7c15) >>> 0;

	return () => {
		const result = (s0 + s3) >>> 0;
		const t = s1 << 9;
		s2 ^= s0;
		s3 ^= s1;
		s1 ^= s2;
		s0 ^= s3;
		s2 ^= t;
		s3 = rotl32(s3, 11);
		return result / 4294967296;
	};
}
