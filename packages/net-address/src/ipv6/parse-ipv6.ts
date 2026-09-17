import { NetAddressSyntaxError } from "../errors.js";
import { tryParseIpv4Address } from "../ipv4/parse-ipv4.js";
import type { BitAddress } from "../prefix/bit-address.js";
import { type BitPrefix, createBitPrefix } from "../prefix/bit-prefix.js";
import { IPV6_BIT_WIDTH, IPV6_GROUP_COUNT } from "./constants.js";

/**
 * An address together with the RFC 4007 zone that disambiguates it.
 *
 * A link-local address is only meaningful beside the interface it is scoped to,
 * which is what `fe80::1%eth0` says.
 */
export type Ipv6ScopedAddress = {
	readonly address: BitAddress;

	/** The text after `%`, verbatim. `null` when the literal carried none. */
	readonly zoneId: string | null;
};

const HEX_GROUP_PATTERN = /^[0-9a-fA-F]{1,4}$/;

/** Appends the 16-bit groups a `:`-separated run spells, or answers `false`. */
function readGroups(parts: readonly string[], groups: number[]): boolean {
	for (let index = 0; index < parts.length; index++) {
		// Non-null: `index` runs over the array's own length.
		const part = parts[index]!;

		// A dotted quad is only legal as the final element, and must be strict:
		// `::ffff:0177.0.0.1` would otherwise smuggle loopback past a check.
		if (part.includes(".")) {
			if (index !== parts.length - 1) {
				return false;
			}

			const embedded = tryParseIpv4Address(part);

			if (embedded === null) {
				return false;
			}

			groups.push(
				Number(embedded.value >> 16n),
				Number(embedded.value & 0xffffn),
			);
			continue;
		}

		if (!HEX_GROUP_PATTERN.test(part)) {
			return false;
		}

		groups.push(Number.parseInt(part, 16));
	}

	return true;
}

function groupsToAddress(groups: readonly number[]): BitAddress {
	let value = 0n;

	for (let index = 0; index < groups.length; index++) {
		// Non-null: `index` runs over the array's own length.
		value = (value << 16n) | BigInt(groups[index]!);
	}

	return { value, bitWidth: IPV6_BIT_WIDTH };
}

/**
 * Parses an RFC 4291 §2.2 literal: eight groups, or a `::` run standing for one
 * or more zero groups, optionally ending in a strict dotted quad.
 *
 * A zone identifier is rejected here; {@link parseIpv6ScopedAddress} takes one.
 * An embedded IPv4 part must be a strict dotted quad, for the reason
 * `parseIpv4Address` documents.
 *
 * @returns The address, 128 bits wide.
 * @throws NetAddressSyntaxError When `text` is not such a literal.
 */
export function parseIpv6Address(text: string): BitAddress {
	const address = tryParseIpv6Address(text);

	if (address === null) {
		throw new NetAddressSyntaxError(text, "not an IPv6 address");
	}

	return address;
}

/** {@link parseIpv6Address}, answering `null` instead of throwing. O(1). */
export function tryParseIpv6Address(text: string): BitAddress | null {
	if (text.includes("%")) {
		return null;
	}

	const compressionIndex = text.indexOf("::");

	if (compressionIndex < 0) {
		const groups: number[] = [];

		if (!readGroups(text.split(":"), groups)) {
			return null;
		}

		return groups.length === IPV6_GROUP_COUNT ? groupsToAddress(groups) : null;
	}

	if (text.includes("::", compressionIndex + 1)) {
		return null;
	}

	const headText = text.slice(0, compressionIndex);
	const tailText = text.slice(compressionIndex + 2);
	const head: number[] = [];
	const tail: number[] = [];

	if (
		!readGroups(headText === "" ? [] : headText.split(":"), head) ||
		!readGroups(tailText === "" ? [] : tailText.split(":"), tail)
	) {
		return null;
	}

	// `::` stands for at least one group, so the explicit ones must leave room.
	if (head.length + tail.length >= IPV6_GROUP_COUNT) {
		return null;
	}

	const zeros = Array.from(
		{ length: IPV6_GROUP_COUNT - head.length - tail.length },
		(): number => 0,
	);

	return groupsToAddress([...head, ...zeros, ...tail]);
}

/**
 * Parses an RFC 4291 literal with an optional RFC 4007 zone identifier.
 *
 * Everything after `%` is the zone, verbatim. RFC 6874's `%25` percent-encoding
 * is a URI-layer concern: decode it before calling, or a zone genuinely named
 * `25eth0` becomes indistinguishable from an encoded `eth0`.
 *
 * @throws NetAddressSyntaxError When `text` is not such a literal, or the zone
 *   is empty.
 */
export function parseIpv6ScopedAddress(text: string): Ipv6ScopedAddress {
	const scoped = tryParseIpv6ScopedAddress(text);

	if (scoped === null) {
		throw new NetAddressSyntaxError(text, "not a scoped IPv6 address");
	}

	return scoped;
}

/** {@link parseIpv6ScopedAddress}, answering `null` instead of throwing. */
export function tryParseIpv6ScopedAddress(
	text: string,
): Ipv6ScopedAddress | null {
	const percentIndex = text.indexOf("%");

	if (percentIndex < 0) {
		const address = tryParseIpv6Address(text);

		return address === null ? null : { address, zoneId: null };
	}

	const zoneId = text.slice(percentIndex + 1);
	const address = tryParseIpv6Address(text.slice(0, percentIndex));

	if (address === null || zoneId.length === 0 || zoneId.includes("%")) {
		return null;
	}

	return { address, zoneId };
}

/**
 * Parses CIDR notation over an IPv6 literal. Host bits are kept.
 *
 * @throws NetAddressSyntaxError When `text` is not `address/length`, or the
 *   length is not an integer in `[0, 128]`.
 */
export function parseIpv6Prefix(text: string): BitPrefix {
	const prefix = tryParseIpv6Prefix(text);

	if (prefix === null) {
		throw new NetAddressSyntaxError(text, "not an IPv6 CIDR prefix");
	}

	return prefix;
}

/** {@link parseIpv6Prefix}, answering `null` instead of throwing. O(1). */
export function tryParseIpv6Prefix(text: string): BitPrefix | null {
	const slash = text.lastIndexOf("/");

	if (slash < 0) {
		return null;
	}

	const address = tryParseIpv6Address(text.slice(0, slash));
	const lengthText = text.slice(slash + 1);

	if (address === null || !/^(?:0|[1-9][0-9]{0,2})$/.test(lengthText)) {
		return null;
	}

	const prefixLength = Number(lengthText);

	return prefixLength <= IPV6_BIT_WIDTH
		? createBitPrefix(address, prefixLength)
		: null;
}
