import type { RandomFn } from "@ac-kit/core";

/**
 * Creates a seeded pseudo-random number generator function using the xorshift32
 * algorithm by George Marsaglia (2003). 32-bit state, 32-bit output.
 *
 * Note: Fails some PractRand tests at large sample sizes, so prefer
 * {@link sfc32}/{@link xoshiro128p} for statistical work; fine for
 * non-adversarial deterministic fixtures, and simple enough to reproduce
 * bit-for-bit in another language (C, Python, Rust, ...) when a fixture must
 * match across an FFI or subprocess boundary.
 *
 * @param seed - The seed value to initialize the 32-bit state. Must be nonzero
 *   (an all-zero state never changes).
 * @returns A function that generates pseudo-random numbers in the range [0, 1)
 *   when called.
 */
export function xorshift32(seed: number): RandomFn {
	let state = seed >>> 0;

	return () => {
		state = (state ^ (state << 13)) >>> 0;
		state = (state ^ (state >>> 17)) >>> 0;
		state = (state ^ (state << 5)) >>> 0;
		return state / 4294967296;
	};
}
