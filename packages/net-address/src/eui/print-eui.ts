import { type BitAddress, bitAddressToBytes } from "../prefix/bit-address.js";
import { EUI48_BIT_WIDTH, EUI64_BIT_WIDTH } from "./constants.js";

/** How the octets are separated. */
export type EuiNotation =
	/** `00:1a:2b:3c:4d:5e` */
	| "colon"
	/** `00-1A-2B-3C-4D-5E` */
	| "hyphen"
	/** `001a.2b3c.4d5e` — the Cisco form, four digits per group. */
	| "dot"
	/** `001a2b3c4d5e` */
	| "bare";

/** Which case the hexadecimal digits are written in. */
export type EuiLetterCase = "lower" | "upper";

/**
 * How to spell an EUI.
 *
 * Neither field has a default: IEEE Std 802 prints `00-1A-2B-3C-4D-5E` and RFC
 * 7042 prints `00:1a:2b:3c:4d:5e`, and a library that quietly picks one makes
 * the other's consumers compare strings that never match.
 */
export type EuiPrintOptions = {
	readonly notation: EuiNotation;
	readonly letterCase: EuiLetterCase;
};

/** The IEEE Std 802 canonical spelling: hyphen-separated, uppercase. */
export const EUI_PRINT_IEEE: EuiPrintOptions = {
	notation: "hyphen",
	letterCase: "upper",
};

/** The IETF spelling of RFC 7042: colon-separated, lowercase. */
export const EUI_PRINT_IETF: EuiPrintOptions = {
	notation: "colon",
	letterCase: "lower",
};

function assertEuiWidth(address: BitAddress): void {
	if (
		address.bitWidth !== EUI48_BIT_WIDTH &&
		address.bitWidth !== EUI64_BIT_WIDTH
	) {
		throw new RangeError(
			`expected a 48- or 64-bit EUI, got ${address.bitWidth} bits`,
		);
	}
}

function joinOctets(octets: Uint8Array, options: EuiPrintOptions): string {
	const digits = Array.from(octets, (byte) => {
		const pair = byte.toString(16).padStart(2, "0");

		return options.letterCase === "upper" ? pair.toUpperCase() : pair;
	});

	switch (options.notation) {
		case "colon": {
			return digits.join(":");
		}
		case "hyphen": {
			return digits.join("-");
		}
		case "dot": {
			const groups: string[] = [];

			for (let index = 0; index < digits.length; index += 2) {
				groups.push(digits.slice(index, index + 2).join(""));
			}

			return groups.join(".");
		}
		case "bare": {
			return digits.join("");
		}
	}
}

/**
 * Prints an EUI-48 or EUI-64 in the requested notation and case. O(1).
 *
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function printEui(
	address: BitAddress,
	options: EuiPrintOptions,
): string {
	assertEuiWidth(address);

	return joinOctets(bitAddressToBytes(address), options);
}

/**
 * Prints the leading 24 bits — the OUI, or the CID for a locally assigned
 * address.
 *
 * The Cisco dotted notation has no three-octet form, so it prints hyphenated.
 *
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function printEuiOui(
	address: BitAddress,
	options: EuiPrintOptions,
): string {
	assertEuiWidth(address);

	return joinOctets(
		bitAddressToBytes(address).subarray(0, 3),
		options.notation === "dot" ? { ...options, notation: "hyphen" } : options,
	);
}
