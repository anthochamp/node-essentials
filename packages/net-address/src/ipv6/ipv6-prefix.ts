import {
	type BitAddress,
	assertBitAddressWidth,
	bitAddressAdd,
} from "../prefix/bit-address.js";
import {
	type BitPrefix,
	bitPrefixAddressCount,
	bitPrefixFirstAddress,
	bitPrefixLastAddress,
} from "../prefix/bit-prefix.js";
import type { BitRange } from "../prefix/bit-range.js";
import { IPV6_BIT_WIDTH } from "./constants.js";

function assertIpv6Prefix(prefix: BitPrefix): void {
	assertBitAddressWidth(prefix.address, IPV6_BIT_WIDTH);
}

/**
 * The prefix's lowest address, host bits cleared.
 *
 * @throws RangeError When the prefix is not over a 128-bit address.
 */
export function ipv6NetworkAddress(prefix: BitPrefix): BitAddress {
	assertIpv6Prefix(prefix);

	return bitPrefixFirstAddress(prefix);
}

/**
 * The prefix's highest address. IPv6 has no broadcast address, so this is an
 * ordinary assignable one.
 *
 * @throws RangeError When the prefix is not over a 128-bit address.
 */
export function ipv6LastAddress(prefix: BitPrefix): BitAddress {
	assertIpv6Prefix(prefix);

	return bitPrefixLastAddress(prefix);
}

/**
 * How many addresses the prefix covers. A `bigint`, because a `/64` holds 2⁶⁴
 * of them and a `double` cannot count that far exactly.
 *
 * @throws RangeError When the prefix is not over a 128-bit address.
 */
export function ipv6AddressCount(prefix: BitPrefix): bigint {
	assertIpv6Prefix(prefix);

	return bitPrefixAddressCount(prefix);
}

/**
 * Every address of the prefix.
 *
 * IPv6 reserves no broadcast address, so unlike IPv4 nothing is excluded at the
 * top. The lowest address is the Subnet-Router anycast address (RFC 4291
 * §2.6.1) on a subnet with a 64-bit interface identifier, which is why
 * {@link ipv6SubnetRouterAnycastAddress} names it separately rather than this
 * range dropping it.
 *
 * @throws RangeError When the prefix is not over a 128-bit address.
 */
export function ipv6UsableHostRange(prefix: BitPrefix): BitRange {
	assertIpv6Prefix(prefix);

	return {
		first: bitPrefixFirstAddress(prefix),
		last: bitPrefixLastAddress(prefix),
	};
}

/**
 * The Subnet-Router anycast address, RFC 4291 §2.6.1: the subnet prefix with an
 * all-zero interface identifier. Every router on the link answers to it.
 *
 * @throws RangeError When the prefix is not over a 128-bit address.
 */
export function ipv6SubnetRouterAnycastAddress(prefix: BitPrefix): BitAddress {
	assertIpv6Prefix(prefix);

	return bitPrefixFirstAddress(prefix);
}

/**
 * The first address after the Subnet-Router anycast address — where host
 * numbering conventionally starts.
 *
 * @throws RangeError When the prefix is not over a 128-bit address, or covers a
 *   single address.
 */
export function ipv6FirstHost(prefix: BitPrefix): BitAddress {
	assertIpv6Prefix(prefix);

	if (prefix.prefixLength === IPV6_BIT_WIDTH) {
		return bitPrefixFirstAddress(prefix);
	}

	return bitAddressAdd(bitPrefixFirstAddress(prefix), 1n);
}
