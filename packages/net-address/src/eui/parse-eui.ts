import { NetAddressSyntaxError } from "../errors.js";
import type { BitAddress } from "../prefix/bit-address.js";
import { EUI48_BIT_WIDTH, EUI64_BIT_WIDTH } from "./constants.js";

const BARE_PATTERN = /^[0-9a-fA-F]+$/;
const COLON_PATTERN = /^[0-9a-fA-F]{2}(?::[0-9a-fA-F]{2})+$/;
const HYPHEN_PATTERN = /^[0-9a-fA-F]{2}(?:-[0-9a-fA-F]{2})+$/;
const DOT_PATTERN = /^[0-9a-fA-F]{4}(?:\.[0-9a-fA-F]{4})+$/;

/**
 * Strips the separators of whichever notation `text` uses.
 *
 * Only one separator kind may appear, so `00:1a-2b:3c-4d:5e` is rejected rather
 * than silently normalised.
 */
function tryReadHexDigits(text: string): string | null {
	if (BARE_PATTERN.test(text)) {
		return text;
	}

	if (COLON_PATTERN.test(text)) {
		return text.replaceAll(":", "");
	}

	if (HYPHEN_PATTERN.test(text)) {
		return text.replaceAll("-", "");
	}

	if (DOT_PATTERN.test(text)) {
		return text.replaceAll(".", "");
	}

	return null;
}

function digitsToAddress(digits: string): BitAddress {
	return { value: BigInt(`0x${digits}`), bitWidth: digits.length * 4 };
}

/**
 * Parses an EUI-48 or EUI-64 in colon, hyphen, Cisco dotted or bare notation.
 *
 * The width comes from how many octets were written, which is the only place it
 * can come from — a bare `1a2b3c` is a 24-bit OUI, not a short MAC address, and
 * is rejected here rather than zero-extended.
 *
 * @throws NetAddressSyntaxError When `text` is not six or eight octets in one
 *   consistent notation.
 */
export function parseEui(text: string): BitAddress {
	const address = tryParseEui(text);

	if (address === null) {
		throw new NetAddressSyntaxError(text, "not an EUI-48 or EUI-64");
	}

	return address;
}

/** {@link parseEui}, answering `null` instead of throwing. O(1). */
export function tryParseEui(text: string): BitAddress | null {
	const digits = tryReadHexDigits(text);

	if (digits === null) {
		return null;
	}

	const bitWidth = digits.length * 4;

	return bitWidth === EUI48_BIT_WIDTH || bitWidth === EUI64_BIT_WIDTH
		? digitsToAddress(digits)
		: null;
}

/**
 * Parses an EUI-48 (a MAC address) in any of the four notations.
 *
 * @throws NetAddressSyntaxError When `text` is not six octets.
 */
export function parseEui48(text: string): BitAddress {
	const address = tryParseEui48(text);

	if (address === null) {
		throw new NetAddressSyntaxError(text, "not an EUI-48");
	}

	return address;
}

/** {@link parseEui48}, answering `null` instead of throwing. O(1). */
export function tryParseEui48(text: string): BitAddress | null {
	const address = tryParseEui(text);

	return address?.bitWidth === EUI48_BIT_WIDTH ? address : null;
}

/**
 * Parses an EUI-64 in any of the four notations.
 *
 * @throws NetAddressSyntaxError When `text` is not eight octets.
 */
export function parseEui64(text: string): BitAddress {
	const address = tryParseEui64(text);

	if (address === null) {
		throw new NetAddressSyntaxError(text, "not an EUI-64");
	}

	return address;
}

/** {@link parseEui64}, answering `null` instead of throwing. O(1). */
export function tryParseEui64(text: string): BitAddress | null {
	const address = tryParseEui(text);

	return address?.bitWidth === EUI64_BIT_WIDTH ? address : null;
}
