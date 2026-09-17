import { NetAddressSyntaxError } from "../errors.js";
import {
	type BitAddress,
	assertBitAddressWidth,
	bitAddressFromBigInt,
	bitAddressToBigInt,
	bitAddressToBytes,
} from "../prefix/bit-address.js";
import type { BitPrefix } from "../prefix/bit-prefix.js";
import { IPV4_BIT_WIDTH } from "./constants.js";

/**
 * Prints the dotted quad.
 *
 * @throws RangeError When the address is not 32 bits wide.
 */
export function printIpv4Address(address: BitAddress): string {
	assertBitAddressWidth(address, IPV4_BIT_WIDTH);

	return bitAddressToBytes(address).join(".");
}

/**
 * Prints CIDR notation, keeping any host bits the prefix carries.
 *
 * @throws RangeError When the prefix is not over a 32-bit address.
 */
export function printIpv4Prefix(prefix: BitPrefix): string {
	return `${printIpv4Address(prefix.address)}/${prefix.prefixLength}`;
}

/**
 * The address as an unsigned 32-bit integer. Exact: 2³²−1 is well inside the
 * safe-integer range.
 *
 * @throws RangeError When the address is not 32 bits wide.
 */
export function ipv4ToUint32(address: BitAddress): number {
	assertBitAddressWidth(address, IPV4_BIT_WIDTH);

	return Number(bitAddressToBigInt(address));
}

/**
 * The inverse of {@link ipv4ToUint32}.
 *
 * @throws RangeError When `value` is not an integer in `[0, 2³² − 1]`.
 */
export function ipv4FromUint32(value: number): BitAddress {
	if (!Number.isInteger(value) || value < 0 || value > 0xff_ff_ff_ff) {
		throw new RangeError(`not an unsigned 32-bit integer: ${value}`);
	}

	return bitAddressFromBigInt(BigInt(value), IPV4_BIT_WIDTH);
}

/**
 * The address as eight lowercase hexadecimal digits, no prefix — the form
 * `/proc/net/route` and many log formats use.
 *
 * @throws RangeError When the address is not 32 bits wide.
 */
export function ipv4ToHex(address: BitAddress): string {
	assertBitAddressWidth(address, IPV4_BIT_WIDTH);

	return address.value.toString(16).padStart(IPV4_BIT_WIDTH / 4, "0");
}

/**
 * The inverse of {@link ipv4ToHex}, also accepting an `0x` prefix and uppercase
 * digits. Exactly eight digits are required, so a truncated value cannot be
 * mistaken for a small address.
 *
 * @throws NetAddressSyntaxError When `text` is not eight hexadecimal digits.
 */
export function ipv4FromHex(text: string): BitAddress {
	const digits = /^0[xX]/.test(text) ? text.slice(2) : text;

	if (!/^[0-9a-fA-F]{8}$/.test(digits)) {
		throw new NetAddressSyntaxError(
			text,
			"not eight hexadecimal digits of an IPv4 address",
		);
	}

	return bitAddressFromBigInt(BigInt(`0x${digits}`), IPV4_BIT_WIDTH);
}

/**
 * The `in-addr.arpa` name for the address, as RFC 1035 §3.5 defines it: the
 * octets reversed, with no trailing dot.
 *
 * @throws RangeError When the address is not 32 bits wide.
 */
export function ipv4ReverseName(address: BitAddress): string {
	assertBitAddressWidth(address, IPV4_BIT_WIDTH);

	return `${bitAddressToBytes(address).toReversed().join(".")}.in-addr.arpa`;
}
