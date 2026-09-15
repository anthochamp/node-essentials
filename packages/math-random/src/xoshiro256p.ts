import { MASK_64N, rotl64, type RandomFn } from "@ac-kit/core";

/**
 * Creates a seeded pseudo-random number generator function using the
 * xoshiro256+ algorithm by Blackman & Vigna (2018). 256-bit state, 64-bit
 * output mapped to [0, 1).
 *
 * Recommended for floating-point generation. The top 53 bits of the 64-bit
 * output are used to preserve IEEE 754 double precision.
 *
 * The seed is accepted as a JS `number`; values above 2^53 may lose precision
 * due to IEEE 754 double representation before the BigInt conversion.
 *
 * @param seed - The seed value used to derive the four 64-bit state words.
 * @returns A function that generates pseudo-random numbers in the range [0, 1)
 *   when called.
 */
export function xoshiro256p(seed: number): RandomFn {
	const seedBig = BigInt(seed);
	let s0 = seedBig & MASK_64N;
	let s1 = (seedBig ^ 0x6d2b79f5n) & MASK_64N;
	let s2 = (seedBig ^ 0x9e3779b9n) & MASK_64N;
	let s3 = (seedBig ^ 0x7f4a7c15n) & MASK_64N;

	return () => {
		const result = (s0 + s3) & MASK_64N;
		const t = (s1 << 17n) & MASK_64N;
		s2 ^= s0;
		s3 ^= s1;
		s1 ^= s2;
		s0 ^= s3;
		s2 ^= t;
		s3 = rotl64(s3, 45n);
		return Number(result >> 11n) / 2 ** 53;
	};
}
