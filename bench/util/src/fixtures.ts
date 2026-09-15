/**
 * Fixtures shared by every benchmark package.
 *
 * Contenders inside a group must see identical input and produce the same
 * answer; otherwise the ranking measures the fixture rather than the code. The
 * generators here are deterministic so a run can be reproduced, and the
 * reference programs in other languages can generate the same values.
 */

import { encodeTextUtf8 } from "@ac-kit/core";
import { xorshift32 } from "@ac-kit/math-random";
import { fnv1a_32, murmur3_32 } from "@ac-kit/noncrypto-hash";

/** Default seed, shared so unrelated packages produce comparable fixtures. */
export const DEFAULT_SEED = 0x2545f491;

/**
 * `count` pseudo-random unsigned 32-bit values.
 *
 * Recovers the exact 32-bit state {@link xorshift32} divides down to a float:
 * multiplying back by 2^32 is lossless for a value that started as an integer
 * with 32 significant bits or fewer.
 */
export function randomUint32Values(
	count: number,
	seed = DEFAULT_SEED,
): number[] {
	const rand = xorshift32(seed);
	return Array.from({ length: count }, () =>
		Math.round(rand() * 0x1_0000_0000),
	);
}

/** `count` pseudo-random floats in `[0, 1)`. */
export function randomFloat64Values(
	count: number,
	seed = DEFAULT_SEED,
): number[] {
	const rand = xorshift32(seed);
	return Array.from({ length: count }, () => rand());
}

/** Sum of `values`, truncated to 32 bits. */
export function checksum(values: Iterable<number>): number {
	let sum = 0;
	for (const value of values) {
		sum = (sum + value) >>> 0;
	}
	return sum;
}

/** Sum of `0..count-1`, the answer every FIFO workload must reach. */
export function sequentialChecksum(count: number): number {
	let sum = 0;
	for (let index = 0; index < count; index++) {
		sum = (sum + index) >>> 0;
	}
	return sum;
}

/** Cheap order-sensitive hash of a string, used to verify text workloads. */
export function hashString(text: string): number {
	return fnv1a_32(encodeTextUtf8(text));
}

/**
 * Seeded 32-bit hash of a string, for structures that take a hash function as a
 * parameter (Bloom filters, Count-Min sketches, HyperLogLog, …).
 *
 * Distinct from {@link hashString}, which is an unseeded checksum used to
 * _verify_ a workload. This one is an input to the code under test, so it has
 * to avalanche: the error bounds those structures document assume a uniformly
 * distributed hash, and a weak one would make a suite measure the hash instead
 * of the structure.
 *
 * Its shape matches `@ac-kit/data`'s `Hash32<string>` structurally, so it can
 * be passed straight in without this package depending on `@ac-kit/data`.
 */
export function stringHash32(text: string, seed: number): number {
	return murmur3_32(encodeTextUtf8(text), seed);
}

/** `count` distinct keys, deterministic so every run compares like with like. */
export function distinctKeys(count: number, prefix = "key"): string[] {
	return Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
}

/** `count` pseudo-random integers in `[0, bound)`. */
export function randomInts(
	count: number,
	bound: number,
	seed = DEFAULT_SEED,
): number[] {
	const rand = xorshift32(seed);
	return Array.from({ length: count }, () => Math.floor(rand() * bound));
}

/**
 * A skewed access pattern over `[0, universe)`: low indices drawn far more
 * often than high ones.
 *
 * A uniform pattern makes every cache look alike, because a replacement policy
 * only shows itself when some entries are genuinely hotter than others.
 * Squaring a uniform draw is the cheapest way to get that skew and stays
 * reproducible.
 */
export function skewedIndices(
	count: number,
	universe: number,
	seed = DEFAULT_SEED,
): number[] {
	const rand = xorshift32(seed);
	return Array.from({ length: count }, () => {
		const value = rand();
		return Math.floor(value * value * universe);
	});
}

/** `count` short lowercase words, deterministic. */
export function words(count: number, seed = DEFAULT_SEED): string[] {
	const rand = xorshift32(seed);
	const alphabet = "abcdefghijklmnopqrstuvwxyz";

	return Array.from({ length: count }, () => {
		const length = 3 + Math.floor(rand() * 6);
		let word = "";

		for (let index = 0; index < length; index++) {
			word += alphabet[Math.floor(rand() * alphabet.length)];
		}

		return word;
	});
}
