import type { Hash32 } from "../hash32.js";

/**
 * FNV-1a over the code units, finished with murmur3's avalanche step.
 *
 * A test double for what a caller would pass from `@ac-kit/algo`. The avalanche
 * matters: these structures' error bounds assume a uniformly distributed hash,
 * so a weak one would make an accuracy assertion measure the hash rather than
 * the structure.
 */
export const hashString: Hash32<string> = (value, seed) => {
	let hash = (seed ^ 0x811c9dc5) >>> 0;

	for (let index = 0; index < value.length; index++) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}

	hash ^= hash >>> 16;
	hash = Math.imul(hash, 0x85ebca6b);
	hash ^= hash >>> 13;
	hash = Math.imul(hash, 0xc2b2ae35);
	hash ^= hash >>> 16;

	return hash >>> 0;
};

/** `count` distinct strings, deterministic so a failure reproduces. */
export const distinctStrings = (count: number, prefix = "item"): string[] =>
	Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
