import type { ComparatorResult } from "@ac-kit/core";

import { assertPrefixLength } from "./_prefix-length.js";
import {
	type BitAddress,
	assertSameBitWidth,
	bitAddressAnd,
	bitAddressCommonPrefixLength,
	bitAddressFromBigInt,
	bitAddressOr,
	bitAddressToBigInt,
} from "./bit-address.js";
import { compareBitAddresses } from "./compare.js";
import { maskFromPrefixLength, wildcardMaskFromPrefixLength } from "./mask.js";

/**
 * An address together with how many of its leading bits are significant.
 *
 * The address is kept exactly as given: `192.168.1.10/24` stays that, so a
 * caller can still read the host part back. Use {@link normalizeBitPrefix} for
 * the network form, which is what every comparison here works on.
 */
export type BitPrefix = {
	readonly address: BitAddress;
	readonly prefixLength: number;
};

/**
 * Pairs an address with a prefix length, keeping any host bits it carries.
 *
 * @throws RangeError When `prefixLength` is outside `[0, address.bitWidth]`.
 */
export function createBitPrefix(
	address: BitAddress,
	prefixLength: number,
): BitPrefix {
	assertPrefixLength(prefixLength, address.bitWidth);

	return { address, prefixLength };
}

/** The netmask matching the prefix length. */
export function bitPrefixNetmask(prefix: BitPrefix): BitAddress {
	return maskFromPrefixLength(prefix.prefixLength, prefix.address.bitWidth);
}

/** The wildcard mask matching the prefix length. */
export function bitPrefixWildcardMask(prefix: BitPrefix): BitAddress {
	return wildcardMaskFromPrefixLength(
		prefix.prefixLength,
		prefix.address.bitWidth,
	);
}

/** The lowest address covered — the network address, host bits cleared. */
export function bitPrefixFirstAddress(prefix: BitPrefix): BitAddress {
	return bitAddressAnd(prefix.address, bitPrefixNetmask(prefix));
}

/** The highest address covered — host bits set. */
export function bitPrefixLastAddress(prefix: BitPrefix): BitAddress {
	return bitAddressOr(
		bitPrefixFirstAddress(prefix),
		bitPrefixWildcardMask(prefix),
	);
}

/** The same prefix with its host bits cleared. */
export function normalizeBitPrefix(prefix: BitPrefix): BitPrefix {
	return {
		address: bitPrefixFirstAddress(prefix),
		prefixLength: prefix.prefixLength,
	};
}

/** Whether the prefix's address already has every host bit clear. */
export function isNormalizedBitPrefix(prefix: BitPrefix): boolean {
	return (
		compareBitAddresses(prefix.address, bitPrefixFirstAddress(prefix)) === 0
	);
}

/** How many addresses the prefix covers: `2 ** (bitWidth - prefixLength)`. */
export function bitPrefixAddressCount(prefix: BitPrefix): bigint {
	return 1n << BigInt(prefix.address.bitWidth - prefix.prefixLength);
}

/**
 * Whether `address` falls inside `prefix`.
 *
 * @throws RangeError When the widths differ.
 */
export function bitPrefixContains(
	prefix: BitPrefix,
	address: BitAddress,
): boolean {
	assertSameBitWidth(prefix.address, address);

	return (
		bitAddressCommonPrefixLength(prefix.address, address) >= prefix.prefixLength
	);
}

/**
 * Whether every address of `inner` falls inside `outer`.
 *
 * @throws RangeError When the widths differ.
 */
export function bitPrefixContainsPrefix(
	outer: BitPrefix,
	inner: BitPrefix,
): boolean {
	return (
		inner.prefixLength >= outer.prefixLength &&
		bitPrefixContains(outer, inner.address)
	);
}

/**
 * Whether `subject` is contained in `container`. The inverse reading of
 * {@link bitPrefixContainsPrefix}, kept because routing code says it this way.
 */
export function bitPrefixIsSubnetOf(
	subject: BitPrefix,
	container: BitPrefix,
): boolean {
	return bitPrefixContainsPrefix(container, subject);
}

/** Whether `subject` contains `contained`. */
export function bitPrefixIsSupernetOf(
	subject: BitPrefix,
	contained: BitPrefix,
): boolean {
	return bitPrefixContainsPrefix(subject, contained);
}

/**
 * Whether the two prefixes share any address. Two prefixes of the same family
 * either nest or are disjoint, so this is "one contains the other".
 *
 * @throws RangeError When the widths differ.
 */
export function bitPrefixOverlaps(a: BitPrefix, b: BitPrefix): boolean {
	assertSameBitWidth(a.address, b.address);

	return (
		bitAddressCommonPrefixLength(a.address, b.address) >=
		Math.min(a.prefixLength, b.prefixLength)
	);
}

/** Whether both cover exactly the same addresses. Host bits are ignored. */
export function bitPrefixEquals(a: BitPrefix, b: BitPrefix): boolean {
	return (
		a.prefixLength === b.prefixLength &&
		compareBitAddresses(bitPrefixFirstAddress(a), bitPrefixFirstAddress(b)) ===
			0
	);
}

/**
 * Orders by network address, then by prefix length — so a supernet sorts before
 * every subnet it contains. Exact, and agrees with {@link bitPrefixEquals}.
 */
export function compareBitPrefixes(
	a: BitPrefix,
	b: BitPrefix,
): ComparatorResult {
	const byNetwork = compareBitAddresses(
		bitPrefixFirstAddress(a),
		bitPrefixFirstAddress(b),
	);

	if (byNetwork !== 0) {
		return byNetwork;
	}

	if (a.prefixLength === b.prefixLength) {
		return 0;
	}

	return a.prefixLength < b.prefixLength ? -1 : 1;
}

/**
 * The prefix one bit shorter — the block this one was halved out of.
 *
 * @returns `null` for a `/0`, which has no supernet.
 */
export function bitPrefixSupernet(prefix: BitPrefix): BitPrefix | null {
	if (prefix.prefixLength === 0) {
		return null;
	}

	return normalizeBitPrefix({
		address: prefix.address,
		prefixLength: prefix.prefixLength - 1,
	});
}

/**
 * The other half of this prefix's supernet — the block it would merge with.
 *
 * @returns `null` for a `/0`, which has no sibling.
 */
export function bitPrefixSibling(prefix: BitPrefix): BitPrefix | null {
	if (prefix.prefixLength === 0) {
		return null;
	}

	const network = bitPrefixFirstAddress(prefix);
	const siblingBit = 1n << BigInt(network.bitWidth - prefix.prefixLength);

	return {
		address: bitAddressFromBigInt(
			bitAddressToBigInt(network) ^ siblingBit,
			network.bitWidth,
		),
		prefixLength: prefix.prefixLength,
	};
}
