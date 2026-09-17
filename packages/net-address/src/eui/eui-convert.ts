import type { BitAddress } from "../prefix/bit-address.js";
import {
	EUI48_BIT_WIDTH,
	EUI64_BIT_WIDTH,
	OUI_BIT_LENGTH,
} from "./constants.js";

/** The 24 bits below the OUI, in either width. */
const EXTENSION_MASK = (1n << BigInt(OUI_BIT_LENGTH)) - 1n;

/** `FF:FE`, and the 16 bits it occupies between the two identifiers. */
const MARKER = 0xfffen;
const MARKER_BIT_LENGTH = 16;
const MARKER_MASK = (1n << BigInt(MARKER_BIT_LENGTH)) - 1n;

/**
 * Widens an EUI-48 to an EUI-64 by inserting `FF:FE` between the 24-bit company
 * identifier and the 24-bit extension identifier, per IEEE's tutorial on the
 * two formats.
 *
 * The U/L bit is left alone. Flipping it is part of building an IPv6 interface
 * identifier, not part of the EUI conversion — see
 * `euiToIpv6InterfaceIdentifier`.
 *
 * @throws RangeError When the address is not 48 bits wide.
 */
export function eui48ToEui64(address: BitAddress): BitAddress {
	if (address.bitWidth !== EUI48_BIT_WIDTH) {
		throw new RangeError(`expected a 48-bit EUI, got ${address.bitWidth} bits`);
	}

	const oui = address.value >> BigInt(OUI_BIT_LENGTH);
	const extension = address.value & EXTENSION_MASK;

	return {
		value:
			(oui << BigInt(MARKER_BIT_LENGTH + OUI_BIT_LENGTH)) |
			(MARKER << BigInt(OUI_BIT_LENGTH)) |
			extension,
		bitWidth: EUI64_BIT_WIDTH,
	};
}

/**
 * Whether an EUI-64 carries the `FF:FE` marker that {@link eui48ToEui64}
 * inserts, and so can be narrowed back.
 *
 * @throws RangeError When the address is not 64 bits wide.
 */
export function isEui64FromEui48(address: BitAddress): boolean {
	if (address.bitWidth !== EUI64_BIT_WIDTH) {
		throw new RangeError(`expected a 64-bit EUI, got ${address.bitWidth} bits`);
	}

	return ((address.value >> BigInt(OUI_BIT_LENGTH)) & MARKER_MASK) === MARKER;
}

/**
 * Narrows an EUI-64 back to the EUI-48 it was widened from, dropping the
 * `FF:FE` marker.
 *
 * @returns `null` when the address carries no marker, which means it is a
 *   native EUI-64 and has no 48-bit form.
 * @throws RangeError When the address is not 64 bits wide.
 */
export function tryEui64ToEui48(address: BitAddress): BitAddress | null {
	if (!isEui64FromEui48(address)) {
		return null;
	}

	const oui = address.value >> BigInt(MARKER_BIT_LENGTH + OUI_BIT_LENGTH);
	const extension = address.value & EXTENSION_MASK;

	return {
		value: (oui << BigInt(OUI_BIT_LENGTH)) | extension,
		bitWidth: EUI48_BIT_WIDTH,
	};
}

/**
 * {@link tryEui64ToEui48}, throwing instead of answering `null`.
 *
 * @throws RangeError When the address is not 64 bits wide, or carries no
 *   `FF:FE` marker.
 */
export function eui64ToEui48(address: BitAddress): BitAddress {
	const narrowed = tryEui64ToEui48(address);

	if (narrowed === null) {
		throw new RangeError("EUI-64 does not encapsulate an EUI-48");
	}

	return narrowed;
}
