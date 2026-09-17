import type { ComparatorResult } from "@ac-kit/core";

import type { BitAddress } from "./bit-address.js";

/**
 * Orders two addresses exactly, narrower widths first and then by unsigned
 * big-endian value.
 *
 * Mixed widths are ordered rather than rejected so that a heterogeneous
 * collection still sorts; within one width the order is the numeric one. Exact,
 * as every comparator in this tree is — there is no tolerance to apply to a bit
 * string. O(1).
 */
export function compareBitAddresses(
	a: BitAddress,
	b: BitAddress,
): ComparatorResult {
	// Width first: `255.255.255.255` is the larger number but the narrower
	// address, and must still sort before any 128-bit one.
	if (a.bitWidth !== b.bitWidth) {
		return a.bitWidth < b.bitWidth ? -1 : 1;
	}

	if (a.value === b.value) {
		return 0;
	}

	return a.value < b.value ? -1 : 1;
}

/** Whether two addresses have the same width and the same bits. */
export function bitAddressEquals(a: BitAddress, b: BitAddress): boolean {
	return compareBitAddresses(a, b) === 0;
}

/**
 * A new array holding `addresses` in {@link compareBitAddresses} order.
 *
 * O(n log n) comparisons, each O(bitWidth / 8); allocates one array of `n`.
 */
export function sortBitAddresses(
	addresses: Iterable<BitAddress>,
): BitAddress[] {
	return Array.from(addresses).sort(compareBitAddresses);
}
