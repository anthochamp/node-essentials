import { bigIntBitLength } from "./bit-length.js";

export function bigIntIsPowerOfTwo(n: bigint): boolean {
	if (n < 0n) throw new RangeError("Input must be a non-negative bigint.");
	return n > 0n && (n & (n - 1n)) === 0n;
}

export function bigIntNextPowerOfTwo(n: bigint): bigint {
	if (n < 0n) throw new RangeError("Input must be a non-negative bigint.");
	if (n <= 1n) return 1n;
	if ((n & (n - 1n)) === 0n) return n;
	return 1n << BigInt(bigIntBitLength(n));
}

export function bigIntPreviousPowerOfTwo(n: bigint): bigint {
	if (n <= 0n) {
		throw new RangeError("Input must be a positive bigint.");
	}
	if (n === 1n) return 1n;

	if ((n & (n - 1n)) === 0n) return n;
	return 1n << BigInt(bigIntBitLength(n) - 1);
}
