import { type ComparatorResult, bigIntBitLength } from "@ac-kit/core";

import {
	type BitAddress,
	assertSameBitWidth,
	bitAddressFromBigInt,
	bitAddressToBigInt,
} from "./bit-address.js";
import {
	type BitPrefix,
	bitPrefixFirstAddress,
	bitPrefixLastAddress,
} from "./bit-prefix.js";
import { compareBitAddresses } from "./compare.js";

/**
 * An arbitrary inclusive run of addresses — `10.0.0.5` through `10.0.0.9` —
 * which no single prefix can express.
 */
export type BitRange = {
	readonly first: BitAddress;
	readonly last: BitAddress;
};

/**
 * Pairs two bounds into an inclusive range.
 *
 * @throws RangeError When the widths differ or `last` precedes `first`.
 */
export function createBitRange(first: BitAddress, last: BitAddress): BitRange {
	assertSameBitWidth(first, last);

	if (compareBitAddresses(first, last) > 0) {
		throw new RangeError("range end precedes its start");
	}

	return { first, last };
}

/** The addresses a prefix covers, as a range. */
export function bitRangeFromPrefix(prefix: BitPrefix): BitRange {
	return {
		first: bitPrefixFirstAddress(prefix),
		last: bitPrefixLastAddress(prefix),
	};
}

/** How many addresses the range covers, both bounds included. */
export function bitRangeAddressCount(range: BitRange): bigint {
	return bitAddressToBigInt(range.last) - bitAddressToBigInt(range.first) + 1n;
}

/**
 * Whether `address` falls within the range.
 *
 * @throws RangeError When the widths differ.
 */
export function bitRangeContains(
	range: BitRange,
	address: BitAddress,
): boolean {
	assertSameBitWidth(range.first, address);

	return (
		compareBitAddresses(range.first, address) <= 0 &&
		compareBitAddresses(address, range.last) <= 0
	);
}

/**
 * Whether the two ranges share any address.
 *
 * @throws RangeError When the widths differ.
 */
export function bitRangeOverlaps(a: BitRange, b: BitRange): boolean {
	assertSameBitWidth(a.first, b.first);

	return (
		compareBitAddresses(a.first, b.last) <= 0 &&
		compareBitAddresses(b.first, a.last) <= 0
	);
}

/** Whether both ranges have the same bounds. */
export function bitRangeEquals(a: BitRange, b: BitRange): boolean {
	return (
		compareBitAddresses(a.first, b.first) === 0 &&
		compareBitAddresses(a.last, b.last) === 0
	);
}

/** Orders by start address, then by end address. Exact. */
export function compareBitRanges(a: BitRange, b: BitRange): ComparatorResult {
	const byFirst = compareBitAddresses(a.first, b.first);

	return byFirst === 0 ? compareBitAddresses(a.last, b.last) : byFirst;
}

/**
 * The shortest list of prefixes covering exactly the range and nothing more.
 *
 * At each step it emits the largest block that both starts at the current
 * address and fits in what is left, which is the standard range-to-CIDR
 * decomposition. At most `2 * bitWidth - 2` prefixes come out, so the result is
 * bounded however wide the range is.
 *
 * @throws RangeError When the widths differ or `last` precedes `first`.
 */
export function bitRangeToPrefixes(range: BitRange): BitPrefix[] {
	assertSameBitWidth(range.first, range.last);

	const { bitWidth } = range.first;
	const last = bitAddressToBigInt(range.last);
	let current = bitAddressToBigInt(range.first);

	if (current > last) {
		throw new RangeError("range end precedes its start");
	}

	const prefixes: BitPrefix[] = [];

	for (;;) {
		// The block may be no larger than the alignment of its start, and no
		// larger than what is left to cover.
		const alignment = current === 0n ? bitWidth : lowestSetBitIndex(current);
		const remaining = last - current + 1n;
		const hostBits = Math.min(alignment, bigIntBitLength(remaining) - 1);

		prefixes.push({
			address: bitAddressFromBigInt(current, bitWidth),
			prefixLength: bitWidth - hostBits,
		});

		const step = 1n << BigInt(hostBits);

		if (current + step > last) {
			return prefixes;
		}

		current += step;
	}
}

/** The index of the lowest set bit of a strictly positive `value`. */
function lowestSetBitIndex(value: bigint): number {
	// `value & -value` isolates that bit, so its bit length names the index.
	// Not `ctz64`: an IPv6 address is 128 bits wide.
	return bigIntBitLength(value & -value) - 1;
}
