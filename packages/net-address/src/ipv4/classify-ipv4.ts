import {
	type BitAddress,
	assertBitAddressWidth,
} from "../prefix/bit-address.js";
import { type BitPrefix, bitPrefixContains } from "../prefix/bit-prefix.js";
import { IPV4_BIT_WIDTH } from "./constants.js";
import { parseIpv4Prefix } from "./parse-ipv4.js";

/** `0.0.0.0/8` — "this host on this network", RFC 1122 §3.2.1.3. */
export const IPV4_THIS_HOST_PREFIX: BitPrefix = parseIpv4Prefix("0.0.0.0/8");

/** `127.0.0.0/8` — loopback, RFC 1122 §3.2.1.3. */
export const IPV4_LOOPBACK_PREFIX: BitPrefix = parseIpv4Prefix("127.0.0.0/8");

/** `169.254.0.0/16` — link-local, RFC 3927. */
export const IPV4_LINK_LOCAL_PREFIX: BitPrefix =
	parseIpv4Prefix("169.254.0.0/16");

/** `10/8`, `172.16/12` and `192.168/16` — private use, RFC 1918. */
export const IPV4_PRIVATE_PREFIXES: readonly BitPrefix[] = [
	parseIpv4Prefix("10.0.0.0/8"),
	parseIpv4Prefix("172.16.0.0/12"),
	parseIpv4Prefix("192.168.0.0/16"),
];

/** `100.64.0.0/10` — shared address space for carrier-grade NAT, RFC 6598. */
export const IPV4_SHARED_PREFIX: BitPrefix = parseIpv4Prefix("100.64.0.0/10");

/** `198.18.0.0/15` — network device benchmarking, RFC 2544. */
export const IPV4_BENCHMARKING_PREFIX: BitPrefix =
	parseIpv4Prefix("198.18.0.0/15");

/** `192.0.2/24`, `198.51.100/24` and `203.0.113/24` — documentation, RFC 5737. */
export const IPV4_DOCUMENTATION_PREFIXES: readonly BitPrefix[] = [
	parseIpv4Prefix("192.0.2.0/24"),
	parseIpv4Prefix("198.51.100.0/24"),
	parseIpv4Prefix("203.0.113.0/24"),
];

/** `224.0.0.0/4` — multicast, RFC 5771. */
export const IPV4_MULTICAST_PREFIX: BitPrefix = parseIpv4Prefix("224.0.0.0/4");

/** `240.0.0.0/4` — reserved for future use, RFC 1112 §4. */
export const IPV4_RESERVED_PREFIX: BitPrefix = parseIpv4Prefix("240.0.0.0/4");

/** `255.255.255.255/32` — limited broadcast, RFC 919 §7. */
export const IPV4_LIMITED_BROADCAST_PREFIX: BitPrefix =
	parseIpv4Prefix("255.255.255.255/32");

/**
 * Which special-purpose block an address falls in.
 *
 * `"global"` means none of the blocks below — not that the address is
 * necessarily routable, since the IANA registry holds further small assignments
 * this package does not enumerate.
 */
export type Ipv4AddressScope =
	| "this-host"
	| "loopback"
	| "link-local"
	| "private"
	| "shared"
	| "benchmarking"
	| "documentation"
	| "multicast"
	| "limited-broadcast"
	| "reserved"
	| "global";

function containsAny(
	prefixes: readonly BitPrefix[],
	address: BitAddress,
): boolean {
	return prefixes.some((prefix) => bitPrefixContains(prefix, address));
}

/**
 * Classifies an address against the RFC 6890 special-purpose registry.
 *
 * Ordered from the narrowest block outwards, because the blocks nest:
 * `255.255.255.255` sits inside `240.0.0.0/4` and must be reported as the
 * limited broadcast rather than as reserved. O(1).
 *
 * @throws RangeError When the address is not 32 bits wide.
 */
export function classifyIpv4Address(address: BitAddress): Ipv4AddressScope {
	assertBitAddressWidth(address, IPV4_BIT_WIDTH);

	if (bitPrefixContains(IPV4_THIS_HOST_PREFIX, address)) {
		return "this-host";
	}

	if (bitPrefixContains(IPV4_LOOPBACK_PREFIX, address)) {
		return "loopback";
	}

	if (bitPrefixContains(IPV4_LINK_LOCAL_PREFIX, address)) {
		return "link-local";
	}

	if (containsAny(IPV4_PRIVATE_PREFIXES, address)) {
		return "private";
	}

	if (bitPrefixContains(IPV4_SHARED_PREFIX, address)) {
		return "shared";
	}

	if (bitPrefixContains(IPV4_BENCHMARKING_PREFIX, address)) {
		return "benchmarking";
	}

	if (containsAny(IPV4_DOCUMENTATION_PREFIXES, address)) {
		return "documentation";
	}

	if (bitPrefixContains(IPV4_MULTICAST_PREFIX, address)) {
		return "multicast";
	}

	if (bitPrefixContains(IPV4_LIMITED_BROADCAST_PREFIX, address)) {
		return "limited-broadcast";
	}

	if (bitPrefixContains(IPV4_RESERVED_PREFIX, address)) {
		return "reserved";
	}

	return "global";
}

/** Whether the address is in `0.0.0.0/8`. */
export function isIpv4ThisHost(address: BitAddress): boolean {
	return classifyIpv4Address(address) === "this-host";
}

/** Whether the address is in `127.0.0.0/8`. */
export function isIpv4Loopback(address: BitAddress): boolean {
	return classifyIpv4Address(address) === "loopback";
}

/** Whether the address is in `169.254.0.0/16`. */
export function isIpv4LinkLocal(address: BitAddress): boolean {
	return classifyIpv4Address(address) === "link-local";
}

/** Whether the address is in one of the RFC 1918 private blocks. */
export function isIpv4Private(address: BitAddress): boolean {
	return classifyIpv4Address(address) === "private";
}

/** Whether the address is in `100.64.0.0/10`, the carrier-grade NAT block. */
export function isIpv4Shared(address: BitAddress): boolean {
	return classifyIpv4Address(address) === "shared";
}

/** Whether the address is in `198.18.0.0/15`. */
export function isIpv4Benchmarking(address: BitAddress): boolean {
	return classifyIpv4Address(address) === "benchmarking";
}

/** Whether the address is in one of the RFC 5737 documentation blocks. */
export function isIpv4Documentation(address: BitAddress): boolean {
	return classifyIpv4Address(address) === "documentation";
}

/** Whether the address is in `224.0.0.0/4`. */
export function isIpv4Multicast(address: BitAddress): boolean {
	return classifyIpv4Address(address) === "multicast";
}

/** Whether the address is exactly `255.255.255.255`. */
export function isIpv4LimitedBroadcast(address: BitAddress): boolean {
	return classifyIpv4Address(address) === "limited-broadcast";
}

/** Whether the address is in `240.0.0.0/4`. */
export function isIpv4Reserved(address: BitAddress): boolean {
	return classifyIpv4Address(address) === "reserved";
}

/**
 * Whether the address falls in any enumerated special-purpose block.
 *
 * An SSRF guard wants this after resolving a name, never a string test on the
 * URL: `0177.0.0.1` and `2130706433` are loopback to a C resolver and are not
 * substrings of `127.`.
 */
export function isIpv4SpecialPurpose(address: BitAddress): boolean {
	return classifyIpv4Address(address) !== "global";
}
