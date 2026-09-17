import { isAsciiDigit } from "@ac-kit/core";
import { fixedUIntBigIsInRange } from "@ac-kit/math-numbers";

import { NetAddressSyntaxError } from "../errors.js";
import type { BitAddress } from "../prefix/bit-address.js";
import { type BitPrefix, createBitPrefix } from "../prefix/bit-prefix.js";
import { IPV4_BIT_WIDTH, IPV4_OCTET_COUNT } from "./constants.js";

/**
 * Reads one strict decimal octet: one to three digits, no leading zero, at most 255.
 *
 * @returns The value, or `null` when the text is not such an octet.
 */
function parseStrictOctet(part: string): number | null {
	if (part.length === 0 || part.length > 3) {
		return null;
	}

	// A leading zero is what makes `0177.0.0.1` read as 127 to `inet_aton` and as
	// 177 to a naive decimal parser — the classic SSRF allowlist bypass.
	if (part.length > 1 && part.charCodeAt(0) === 0x30) {
		return null;
	}

	let value = 0;

	for (let index = 0; index < part.length; index++) {
		const code = part.charCodeAt(index);

		if (!isAsciiDigit(code)) {
			return null;
		}

		value = value * 10 + (code - 0x30);
	}

	return value <= 255 ? value : null;
}

/**
 * Parses a dotted quad, strictly.
 *
 * Exactly four decimal octets, no leading zeros, no octal, no hexadecimal, no
 * abbreviated forms. Everything a C `inet_aton` would also accept — `127.1`,
 * `0177.0.0.1`, `0x7f.0.0.1`, `2130706433` — is rejected, because a parser that
 * accepts them disagrees with the one the next hop uses, and that disagreement
 * is how an allowlist gets bypassed. {@link parseInetAtonIpv4Address} is there
 * when the legacy grammar is genuinely wanted.
 *
 * @returns The address, 32 bits wide.
 * @throws NetAddressSyntaxError When `text` is not a strict dotted quad.
 */
export function parseIpv4Address(text: string): BitAddress {
	const address = tryParseIpv4Address(text);

	if (address === null) {
		throw new NetAddressSyntaxError(text, "not a dotted-quad IPv4 address");
	}

	return address;
}

/** {@link parseIpv4Address}, answering `null` instead of throwing. O(1). */
export function tryParseIpv4Address(text: string): BitAddress | null {
	const parts = text.split(".");

	if (parts.length !== IPV4_OCTET_COUNT) {
		return null;
	}

	let value = 0n;

	for (let index = 0; index < IPV4_OCTET_COUNT; index++) {
		// Non-null: `parts` has exactly `IPV4_OCTET_COUNT` entries.
		const octet = parseStrictOctet(parts[index]!);

		if (octet === null) {
			return null;
		}

		value = (value << 8n) | BigInt(octet);
	}

	return { value, bitWidth: IPV4_BIT_WIDTH };
}

/** Reads one `inet_aton` part: hexadecimal `0x…`, octal `0…`, else decimal. */
function parseLegacyPart(part: string): bigint | null {
	if (part.length === 0) {
		return null;
	}

	if (/^0[xX][0-9a-fA-F]+$/.test(part)) {
		return BigInt(`0x${part.slice(2)}`);
	}

	if (/^0[0-7]+$/.test(part)) {
		return BigInt(`0o${part.slice(1)}`);
	}

	return /^(?:0|[1-9][0-9]*)$/.test(part) ? BigInt(part) : null;
}

/**
 * Parses the legacy C `inet_aton` grammar: one to four parts, each decimal,
 * octal (leading `0`) or hexadecimal (leading `0x`), with the last part filling
 * the remaining octets.
 *
 * `2130706433`, `127.1` and `0177.0.0.1` all name `127.0.0.1` here. **Never
 * validate an allowlist with this.** It exists so a caller reproducing what
 * `ping` or a legacy configuration file accepts can do so deliberately, and so
 * a security check can prove that a hostile string resolves to a blocked
 * address under the lenient grammar too.
 *
 * @returns The address, 32 bits wide.
 * @throws NetAddressSyntaxError When `text` is not an `inet_aton` form.
 */
export function parseInetAtonIpv4Address(text: string): BitAddress {
	const address = tryParseInetAtonIpv4Address(text);

	if (address === null) {
		throw new NetAddressSyntaxError(text, "not an inet_aton IPv4 address");
	}

	return address;
}

/** {@link parseInetAtonIpv4Address}, answering `null` instead of throwing. */
export function tryParseInetAtonIpv4Address(text: string): BitAddress | null {
	const parts = text.split(".");

	if (parts.length < 1 || parts.length > IPV4_OCTET_COUNT) {
		return null;
	}

	const values: bigint[] = [];

	for (const part of parts) {
		const value = parseLegacyPart(part);

		if (value === null) {
			return null;
		}

		values.push(value);
	}

	// Every part but the last is one octet; the last fills whatever is left.
	const tailBitWidth = (IPV4_OCTET_COUNT - values.length + 1) * 8;
	let value = 0n;

	for (let index = 0; index < values.length - 1; index++) {
		// Non-null: `index` stays below `values.length`.
		const octet = values[index]!;

		if (octet > 255n) {
			return null;
		}

		value = (value << 8n) | octet;
	}

	// Non-null: `values` holds at least one entry.
	const tail = values.at(-1)!;

	if (!fixedUIntBigIsInRange(tail, tailBitWidth)) {
		return null;
	}

	return {
		value: (value << BigInt(tailBitWidth)) | tail,
		bitWidth: IPV4_BIT_WIDTH,
	};
}

/**
 * Parses CIDR notation — a strict dotted quad, `/`, and a prefix length.
 *
 * Host bits are kept: `192.168.1.10/24` parses to exactly that. A dotted
 * netmask in place of the length is not accepted; convert one with
 * `prefixLengthFromMask` instead.
 *
 * @throws NetAddressSyntaxError When `text` is not `address/length`, or the
 *   length is not an integer in `[0, 32]`.
 */
export function parseIpv4Prefix(text: string): BitPrefix {
	const prefix = tryParseIpv4Prefix(text);

	if (prefix === null) {
		throw new NetAddressSyntaxError(text, "not an IPv4 CIDR prefix");
	}

	return prefix;
}

/** {@link parseIpv4Prefix}, answering `null` instead of throwing. O(1). */
export function tryParseIpv4Prefix(text: string): BitPrefix | null {
	const slash = text.indexOf("/");

	if (slash < 0) {
		return null;
	}

	const address = tryParseIpv4Address(text.slice(0, slash));
	const lengthText = text.slice(slash + 1);

	if (address === null || !/^(?:0|[1-9][0-9]?)$/.test(lengthText)) {
		return null;
	}

	const prefixLength = Number(lengthText);

	return prefixLength <= IPV4_BIT_WIDTH
		? createBitPrefix(address, prefixLength)
		: null;
}
