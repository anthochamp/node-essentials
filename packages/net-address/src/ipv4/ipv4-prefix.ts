import {
	type BitAddress,
	assertBitAddressWidth,
	bitAddressAdd,
} from "../prefix/bit-address.js";
import {
	type BitPrefix,
	bitPrefixFirstAddress,
	bitPrefixLastAddress,
} from "../prefix/bit-prefix.js";
import type { BitRange } from "../prefix/bit-range.js";
import { IPV4_BIT_WIDTH } from "./constants.js";

function assertIpv4Prefix(prefix: BitPrefix): void {
	assertBitAddressWidth(prefix.address, IPV4_BIT_WIDTH);
}

/**
 * The network address — the prefix's lowest address, host bits cleared.
 *
 * @throws RangeError When the prefix is not over a 32-bit address.
 */
export function ipv4NetworkAddress(prefix: BitPrefix): BitAddress {
	assertIpv4Prefix(prefix);

	return bitPrefixFirstAddress(prefix);
}

/**
 * The directed broadcast address — the prefix's highest address.
 *
 * @returns `null` for `/31` and `/32`, which have none: RFC 3021 gives a `/31`
 *   two host addresses and no broadcast, and a `/32` is one host.
 * @throws RangeError When the prefix is not over a 32-bit address.
 */
export function ipv4BroadcastAddress(prefix: BitPrefix): BitAddress | null {
	assertIpv4Prefix(prefix);

	return prefix.prefixLength >= IPV4_BIT_WIDTH - 1
		? null
		: bitPrefixLastAddress(prefix);
}

/**
 * The addresses usable by a host.
 *
 * `/30` and shorter exclude the network and broadcast addresses; a `/31` is
 * both of its addresses (RFC 3021); a `/32` is its single address.
 *
 * @throws RangeError When the prefix is not over a 32-bit address.
 */
export function ipv4UsableHostRange(prefix: BitPrefix): BitRange {
	assertIpv4Prefix(prefix);

	const first = bitPrefixFirstAddress(prefix);
	const last = bitPrefixLastAddress(prefix);

	if (prefix.prefixLength >= IPV4_BIT_WIDTH - 1) {
		return { first, last };
	}

	return { first: bitAddressAdd(first, 1n), last: bitAddressAdd(last, -1n) };
}

/**
 * The first usable host address.
 *
 * @throws RangeError When the prefix is not over a 32-bit address.
 */
export function ipv4FirstHost(prefix: BitPrefix): BitAddress {
	return ipv4UsableHostRange(prefix).first;
}

/**
 * The last usable host address.
 *
 * @throws RangeError When the prefix is not over a 32-bit address.
 */
export function ipv4LastHost(prefix: BitPrefix): BitAddress {
	return ipv4UsableHostRange(prefix).last;
}

/**
 * How many addresses the prefix covers, including network and broadcast.
 *
 * @throws RangeError When the prefix is not over a 32-bit address.
 */
export function ipv4AddressCount(prefix: BitPrefix): number {
	assertIpv4Prefix(prefix);

	return 2 ** (IPV4_BIT_WIDTH - prefix.prefixLength);
}

/**
 * How many addresses a host may take — 254 for a `/24`, 2 for a `/31`, 1 for a
 * `/32`.
 *
 * @throws RangeError When the prefix is not over a 32-bit address.
 */
export function ipv4HostCount(prefix: BitPrefix): number {
	const total = ipv4AddressCount(prefix);

	return prefix.prefixLength >= IPV4_BIT_WIDTH - 1 ? total : total - 2;
}
