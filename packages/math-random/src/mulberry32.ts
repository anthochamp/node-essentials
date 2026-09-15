import type { RandomFn } from "@ac-kit/core";

/**
 * Creates a seeded pseudo-random number generator function using the Mulberry32
 * algorithm.
 *
 * @param seed - The seed value to initialize the generator. It should be a
 *   32-bit unsigned integer.
 * @returns A function that generates pseudo-random numbers in the range [0, 1)
 *   when called.
 */
export function mulberry32(seed: number): RandomFn {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
