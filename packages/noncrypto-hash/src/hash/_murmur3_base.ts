import { MASK_64N } from "@ac-kit/core";

export function fmix32(value: number): number {
	let hash = value;
	hash = (hash ^ (hash >>> 16)) >>> 0;
	hash = Math.imul(hash, 0x85ebca6b) >>> 0;
	hash = (hash ^ (hash >>> 13)) >>> 0;
	hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
	return (hash ^ (hash >>> 16)) >>> 0;
}

export function fmix64(value: bigint): bigint {
	let hash = value;
	hash ^= hash >> 33n;
	hash = (hash * 0xff51afd7ed558ccdn) & MASK_64N;
	hash ^= hash >> 33n;
	hash = (hash * 0xc4ceb9fe1a85ec53n) & MASK_64N;
	hash ^= hash >> 33n;
	return hash;
}
