import { IPV4_BIT_WIDTH } from "../ipv4/constants.js";
import {
	type BitAddress,
	assertBitAddressWidth,
	bitAddressFromBigInt,
	bitAddressToBigInt,
} from "../prefix/bit-address.js";
import { type BitPrefix, createBitPrefix } from "../prefix/bit-prefix.js";
import { IPV6_BIT_WIDTH } from "./constants.js";
import { parseIpv6Prefix } from "./parse-ipv6.js";

/** `::ffff:0:0/96` — the IPv4-mapped block, RFC 4291 §2.5.5.2. */
export const IPV6_IPV4_MAPPED_PREFIX: BitPrefix =
	parseIpv6Prefix("::ffff:0:0/96");

/** `::/96` — the deprecated IPv4-compatible block, RFC 4291 §2.5.5.1. */
export const IPV6_IPV4_COMPATIBLE_PREFIX: BitPrefix = parseIpv6Prefix("::/96");

/**
 * Whether the address is IPv4-mapped — `::ffff:a.b.c.d`.
 *
 * @throws RangeError When the address is not 128 bits wide.
 */
export function isIpv6Ipv4Mapped(address: BitAddress): boolean {
	assertBitAddressWidth(address, IPV6_BIT_WIDTH);

	return address.value >> BigInt(IPV4_BIT_WIDTH) === 0xffffn;
}

/**
 * Whether the address is IPv4-compatible — `::a.b.c.d`, deprecated by RFC 4291.
 *
 * `::` and `::1` are excluded: both fall in `::/96` numerically but neither
 * embeds an IPv4 address.
 *
 * @throws RangeError When the address is not 128 bits wide.
 */
export function isIpv6Ipv4Compatible(address: BitAddress): boolean {
	assertBitAddressWidth(address, IPV6_BIT_WIDTH);

	return address.value >> BigInt(IPV4_BIT_WIDTH) === 0n && address.value > 1n;
}

/**
 * The IPv4-mapped form of an IPv4 address: `192.0.2.1` becomes
 * `::ffff:192.0.2.1`.
 *
 * @throws RangeError When the address is not 32 bits wide.
 */
export function ipv6FromIpv4(address: BitAddress): BitAddress {
	assertBitAddressWidth(address, IPV4_BIT_WIDTH);

	return {
		value: (0xffffn << BigInt(IPV4_BIT_WIDTH)) | address.value,
		bitWidth: IPV6_BIT_WIDTH,
	};
}

/**
 * The IPv4 address an IPv4-mapped or IPv4-compatible literal embeds.
 *
 * @returns `null` when the address embeds neither.
 * @throws RangeError When the address is not 128 bits wide.
 */
export function ipv4FromIpv6(address: BitAddress): BitAddress | null {
	if (!isIpv6Ipv4Mapped(address) && !isIpv6Ipv4Compatible(address)) {
		return null;
	}

	return bitAddressFromBigInt(
		bitAddressToBigInt(address) & 0xff_ff_ff_ffn,
		IPV4_BIT_WIDTH,
	);
}

/**
 * Widens an IPv4 prefix to its IPv4-mapped counterpart: `10.0.0.0/8` becomes
 * `::ffff:10.0.0.0/104`.
 *
 * @throws RangeError When the prefix is not over a 32-bit address.
 */
export function ipv6PrefixFromIpv4Prefix(prefix: BitPrefix): BitPrefix {
	return createBitPrefix(
		ipv6FromIpv4(prefix.address),
		IPV6_BIT_WIDTH - IPV4_BIT_WIDTH + prefix.prefixLength,
	);
}
