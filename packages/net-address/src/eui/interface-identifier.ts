import type { BitAddress } from "../prefix/bit-address.js";
import { EUI48_BIT_WIDTH, EUI64_BIT_WIDTH } from "./constants.js";
import { eui48ToEui64 } from "./eui-convert.js";

/** The IPv6 interface identifier occupies the low 64 bits of an address. */
export const IPV6_INTERFACE_IDENTIFIER_BIT_WIDTH = 64;

/** The U/L bit is the second-most significant bit of the first octet. */
const UNIVERSAL_LOCAL_BIT_INDEX = 6;

function withFlippedUniversalLocalBit(address: BitAddress): BitAddress {
	return {
		value:
			address.value ^
			(1n << BigInt(address.bitWidth - 1 - UNIVERSAL_LOCAL_BIT_INDEX)),
		bitWidth: address.bitWidth,
	};
}

/**
 * Builds the IPv6 interface identifier of RFC 4291 Appendix A.
 *
 * An EUI-48 is first widened with `FF:FE`; then — for either width — **the U/L
 * bit is complemented**. That inversion is the step implementations skip: the
 * identifier form spells "universal" as a one, the opposite of IEEE 802, so a
 * universally administered `34-56-78-9A-BC-DE` yields `36-56-78-FF-FE-9A-BC-DE`
 * and not `34-…`.
 *
 * @returns A 64-bit value.
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function euiToIpv6InterfaceIdentifier(address: BitAddress): BitAddress {
	if (address.bitWidth === EUI48_BIT_WIDTH) {
		return withFlippedUniversalLocalBit(eui48ToEui64(address));
	}

	if (address.bitWidth === EUI64_BIT_WIDTH) {
		return withFlippedUniversalLocalBit(address);
	}

	throw new RangeError(
		`expected a 48- or 64-bit EUI, got ${address.bitWidth} bits`,
	);
}

/**
 * The inverse of {@link euiToIpv6InterfaceIdentifier}: complements the U/L bit
 * back, yielding the EUI-64 the identifier was built from.
 *
 * @throws RangeError When the identifier is not 64 bits wide.
 */
export function ipv6InterfaceIdentifierToEui64(
	identifier: BitAddress,
): BitAddress {
	if (identifier.bitWidth !== IPV6_INTERFACE_IDENTIFIER_BIT_WIDTH) {
		throw new RangeError(
			`expected a 64-bit interface identifier, got ${identifier.bitWidth} bits`,
		);
	}

	return withFlippedUniversalLocalBit(identifier);
}
