import {
	type BitAddress,
	assertBitAddressWidth,
	bitAddressBitAt,
	bitAddressIsZero,
	bitAddressToBigInt,
} from "../prefix/bit-address.js";
import { type BitPrefix, bitPrefixContains } from "../prefix/bit-prefix.js";
import { IPV6_BIT_WIDTH } from "./constants.js";
import { isIpv6Ipv4Compatible, isIpv6Ipv4Mapped } from "./ipv4-mapped.js";
import { parseIpv6Address, parseIpv6Prefix } from "./parse-ipv6.js";

/** `::` — the unspecified address, RFC 4291 §2.5.2. */
export const IPV6_UNSPECIFIED_ADDRESS: BitAddress = parseIpv6Address("::");

/** `::1` — the loopback address, RFC 4291 §2.5.3. */
export const IPV6_LOOPBACK_ADDRESS: BitAddress = parseIpv6Address("::1");

/** `fe80::/10` — link-local unicast, RFC 4291 §2.5.6. */
export const IPV6_LINK_LOCAL_PREFIX: BitPrefix = parseIpv6Prefix("fe80::/10");

/** `fc00::/7` — unique local addresses, RFC 4193. */
export const IPV6_UNIQUE_LOCAL_PREFIX: BitPrefix = parseIpv6Prefix("fc00::/7");

/** `ff00::/8` — multicast, RFC 4291 §2.7. */
export const IPV6_MULTICAST_PREFIX: BitPrefix = parseIpv6Prefix("ff00::/8");

/** `2001:db8::/32` — documentation, RFC 3849. */
export const IPV6_DOCUMENTATION_PREFIX: BitPrefix =
	parseIpv6Prefix("2001:db8::/32");

/** `2001::/32` — Teredo tunnelling, RFC 4380. */
export const IPV6_TEREDO_PREFIX: BitPrefix = parseIpv6Prefix("2001::/32");

/** `2002::/16` — 6to4, RFC 3056. */
export const IPV6_6TO4_PREFIX: BitPrefix = parseIpv6Prefix("2002::/16");

/**
 * Which special-purpose block an address falls in.
 *
 * `"global"` means none of the blocks below — not that the address is
 * necessarily routable, since the IANA registry holds further assignments this
 * package does not enumerate.
 */
export type Ipv6AddressScope =
	| "unspecified"
	| "loopback"
	| "ipv4-mapped"
	| "ipv4-compatible"
	| "link-local"
	| "unique-local"
	| "multicast"
	| "documentation"
	| "teredo"
	| "6to4"
	| "global";

/**
 * Classifies an address against RFC 4291 and the RFC 6890 special-purpose
 * registry.
 *
 * Ordered narrowest first, because the blocks nest: `::1` sits inside `::/96`
 * and must be reported as loopback rather than as IPv4-compatible, and
 * `2001:db8::/32` sits beside — not inside — Teredo's `2001::/32`. O(1).
 *
 * @throws RangeError When the address is not 128 bits wide.
 */
export function classifyIpv6Address(address: BitAddress): Ipv6AddressScope {
	assertBitAddressWidth(address, IPV6_BIT_WIDTH);

	if (bitAddressIsZero(address)) {
		return "unspecified";
	}

	if (bitAddressToBigInt(address) === 1n) {
		return "loopback";
	}

	if (isIpv6Ipv4Mapped(address)) {
		return "ipv4-mapped";
	}

	if (isIpv6Ipv4Compatible(address)) {
		return "ipv4-compatible";
	}

	if (bitPrefixContains(IPV6_MULTICAST_PREFIX, address)) {
		return "multicast";
	}

	if (bitPrefixContains(IPV6_LINK_LOCAL_PREFIX, address)) {
		return "link-local";
	}

	if (bitPrefixContains(IPV6_UNIQUE_LOCAL_PREFIX, address)) {
		return "unique-local";
	}

	if (bitPrefixContains(IPV6_DOCUMENTATION_PREFIX, address)) {
		return "documentation";
	}

	if (bitPrefixContains(IPV6_TEREDO_PREFIX, address)) {
		return "teredo";
	}

	if (bitPrefixContains(IPV6_6TO4_PREFIX, address)) {
		return "6to4";
	}

	return "global";
}

/** Whether the address is `::`. */
export function isIpv6Unspecified(address: BitAddress): boolean {
	return classifyIpv6Address(address) === "unspecified";
}

/** Whether the address is `::1`. */
export function isIpv6Loopback(address: BitAddress): boolean {
	return classifyIpv6Address(address) === "loopback";
}

/** Whether the address is in `fe80::/10`. */
export function isIpv6LinkLocal(address: BitAddress): boolean {
	return classifyIpv6Address(address) === "link-local";
}

/** Whether the address is in `fc00::/7`. */
export function isIpv6UniqueLocal(address: BitAddress): boolean {
	return classifyIpv6Address(address) === "unique-local";
}

/** Whether the address is in `ff00::/8`. */
export function isIpv6Multicast(address: BitAddress): boolean {
	return classifyIpv6Address(address) === "multicast";
}

/** Whether the address is in `2001:db8::/32`. */
export function isIpv6Documentation(address: BitAddress): boolean {
	return classifyIpv6Address(address) === "documentation";
}

/** Whether the address is in `2001::/32`. */
export function isIpv6Teredo(address: BitAddress): boolean {
	return classifyIpv6Address(address) === "teredo";
}

/** Whether the address is in `2002::/16`. */
export function isIpv6SixToFour(address: BitAddress): boolean {
	return classifyIpv6Address(address) === "6to4";
}

/**
 * Whether the address falls in any enumerated special-purpose block.
 *
 * An SSRF guard wants this on the parsed address, and must also unwrap an
 * IPv4-mapped literal with `ipv4FromIpv6` before classifying:
 * `::ffff:127.0.0.1` is loopback, and no substring test for `127.` finds it.
 */
export function isIpv6SpecialPurpose(address: BitAddress): boolean {
	return classifyIpv6Address(address) !== "global";
}

/** How far a multicast address is allowed to travel, RFC 4291 §2.7. */
export type Ipv6MulticastScope =
	| "reserved"
	| "interface-local"
	| "link-local"
	| "realm-local"
	| "admin-local"
	| "site-local"
	| "organization-local"
	| "global"
	| "unassigned";

const MULTICAST_SCOPES: Readonly<Record<number, Ipv6MulticastScope>> = {
	0x0: "reserved",
	0x1: "interface-local",
	0x2: "link-local",
	0x3: "realm-local",
	0x4: "admin-local",
	0x5: "site-local",
	0x8: "organization-local",
	0xe: "global",
	0xf: "reserved",
};

/**
 * The scope nibble of a multicast address.
 *
 * @returns `null` when the address is not multicast.
 * @throws RangeError When the address is not 128 bits wide.
 */
export function ipv6MulticastScope(
	address: BitAddress,
): Ipv6MulticastScope | null {
	assertBitAddressWidth(address, IPV6_BIT_WIDTH);

	if (!bitPrefixContains(IPV6_MULTICAST_PREFIX, address)) {
		return null;
	}

	// RFC 4291 §2.7 lays the second octet out as `flgs` then `scop`.
	return (
		MULTICAST_SCOPES[
			Number((address.value >> BigInt(IPV6_BIT_WIDTH - 16)) & 0xfn)
		] ?? "unassigned"
	);
}

/**
 * Whether the multicast address is transient — assigned dynamically rather than
 * by IANA, which is the `T` flag of RFC 4291 §2.7.
 *
 * @returns `null` when the address is not multicast.
 * @throws RangeError When the address is not 128 bits wide.
 */
export function isIpv6TransientMulticast(address: BitAddress): boolean | null {
	assertBitAddressWidth(address, IPV6_BIT_WIDTH);

	if (!bitPrefixContains(IPV6_MULTICAST_PREFIX, address)) {
		return null;
	}

	// The `T` flag is the last of the four `flgs` bits, so bit 11 overall.
	return bitAddressBitAt(address, 11) === 1;
}
