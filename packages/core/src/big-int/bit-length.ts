import { bigIntAbs } from "./abs.js";

/**
 * Number of bits in `|value|`, which is `⌊log₂|value|⌋ + 1`. Zero for `0n`.
 *
 * Computed from the hexadecimal string rather than by shifting, so the cost is
 * linear in the width rather than quadratic.
 */
export function bigIntBitLength(value: bigint): number {
	const magnitude = bigIntAbs(value);

	if (magnitude === 0n) {
		return 0;
	}

	const hex = magnitude.toString(16);

	// The leading hex digit contributes between 1 and 4 bits.
	return (hex.length - 1) * 4 + (32 - Math.clz32(Number.parseInt(hex[0]!, 16)));
}
