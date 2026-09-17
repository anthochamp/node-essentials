import { bigIntBitLength, bigIntIsPowerOfTwo } from "@ac-kit/core";
import {
	fixedUIntBigMax,
	fixedUIntBigNot,
	fixedUIntBigShiftLeft,
} from "@ac-kit/math-numbers";

import { assertPrefixLength } from "./_prefix-length.js";
import {
	type BitAddress,
	bitAddressFromBigInt,
	bitAddressToBigInt,
} from "./bit-address.js";

/**
 * The netmask for a prefix length: `prefixLength` leading ones, the rest zero.
 *
 * @throws RangeError When `bitWidth` is not a positive multiple of 8, or
 *   `prefixLength` is outside `[0, bitWidth]`.
 */
export function maskFromPrefixLength(
	prefixLength: number,
	bitWidth: number,
): BitAddress {
	assertPrefixLength(prefixLength, bitWidth);

	return bitAddressFromBigInt(
		fixedUIntBigShiftLeft(
			fixedUIntBigMax(prefixLength),
			bitWidth - prefixLength,
			bitWidth,
		),
		bitWidth,
	);
}

/**
 * The wildcard (inverse) mask for a prefix length, as Cisco ACLs spell it:
 * `prefixLength` leading zeros, the rest ones.
 *
 * @throws RangeError When `bitWidth` is not a positive multiple of 8, or
 *   `prefixLength` is outside `[0, bitWidth]`.
 */
export function wildcardMaskFromPrefixLength(
	prefixLength: number,
	bitWidth: number,
): BitAddress {
	assertPrefixLength(prefixLength, bitWidth);

	return bitAddressFromBigInt(
		fixedUIntBigMax(bitWidth - prefixLength),
		bitWidth,
	);
}

/** Whether a mask is a run of ones followed by a run of zeros. */
export function isContiguousMask(mask: BitAddress): boolean {
	// The complement of a left-aligned run of ones is a right-aligned run of
	// ones, and those are exactly the values one below a power of two.
	const complement = fixedUIntBigNot(bitAddressToBigInt(mask), mask.bitWidth);

	return complement === 0n || bigIntIsPowerOfTwo(complement + 1n);
}

/**
 * How many leading ones a netmask has.
 *
 * @throws RangeError When the mask is not contiguous — `255.0.255.0` names no
 *   prefix length, and rounding it to one would silently widen an ACL.
 */
export function prefixLengthFromMask(mask: BitAddress): number {
	if (!isContiguousMask(mask)) {
		throw new RangeError("netmask is not a contiguous run of leading ones");
	}

	// The trailing zeros are the wildcard part, and on a contiguous mask its
	// complement is exactly that many low bits set.
	return (
		mask.bitWidth -
		bigIntBitLength(fixedUIntBigNot(bitAddressToBigInt(mask), mask.bitWidth))
	);
}
