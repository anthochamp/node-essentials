import {
	type BitAddress,
	bitAddressBitAt,
	bitAddressIsAllOnes,
	bitAddressIsZero,
} from "../prefix/bit-address.js";
import { type BitPrefix, createBitPrefix } from "../prefix/bit-prefix.js";
import {
	EUI48_BIT_WIDTH,
	EUI64_BIT_WIDTH,
	OUI_BIT_LENGTH,
} from "./constants.js";
import { parseEui48, parseEui64 } from "./parse-eui.js";

/** `ff:ff:ff:ff:ff:ff` — the EUI-48 broadcast address. */
export const EUI48_BROADCAST_ADDRESS: BitAddress =
	parseEui48("ff:ff:ff:ff:ff:ff");

/** `00:00:00:00:00:00` — the EUI-48 null address. */
export const EUI48_NULL_ADDRESS: BitAddress = parseEui48("00:00:00:00:00:00");

/** `ff:ff:ff:ff:ff:ff:ff:ff` — the EUI-64 broadcast address. */
export const EUI64_BROADCAST_ADDRESS: BitAddress = parseEui64(
	"ff:ff:ff:ff:ff:ff:ff:ff",
);

/** `00:00:00:00:00:00:00:00` — the EUI-64 null address. */
export const EUI64_NULL_ADDRESS: BitAddress = parseEui64(
	"00:00:00:00:00:00:00:00",
);

/** Which IEEE registry block an assignment came from, and how wide it is. */
export type EuiAssignmentBlock = "ma-l" | "ma-m" | "ma-s";

/**
 * How many leading bits the IEEE assigns for each registry block.
 *
 * MA-L leaves 24 bits to the assignee, MA-M 20 and MA-S 12 — which is why a
 * small vendor buys an MA-S and a network card maker buys an MA-L.
 */
export const EUI_ASSIGNMENT_BLOCK_BIT_LENGTHS: Readonly<
	Record<EuiAssignmentBlock, number>
> = {
	"ma-l": 24,
	"ma-m": 28,
	"ma-s": 36,
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

/**
 * Whether the I/G bit is set — a group (multicast) address rather than an
 * individual one. It is the least significant bit of the first octet.
 *
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function isEuiGroup(address: BitAddress): boolean {
	assertEuiWidth(address);

	return bitAddressBitAt(address, 7) === 1;
}

/**
 * Whether the address names a single interface.
 *
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function isEuiIndividual(address: BitAddress): boolean {
	return !isEuiGroup(address);
}

/**
 * Whether the U/L bit is set — a locally administered address rather than one
 * from an IEEE registry. It is the second-least significant bit of the first
 * octet.
 *
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function isEuiLocal(address: BitAddress): boolean {
	assertEuiWidth(address);

	return bitAddressBitAt(address, 6) === 1;
}

/**
 * Whether the address came from an IEEE registry.
 *
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function isEuiUniversal(address: BitAddress): boolean {
	return !isEuiLocal(address);
}

/**
 * The leading 24 bits as an integer — the OUI of a universally administered
 * address, or the CID of a locally administered one.
 *
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function euiOui(address: BitAddress): number {
	assertEuiWidth(address);

	return Number(address.value >> BigInt(address.bitWidth - OUI_BIT_LENGTH));
}

/**
 * Whether the leading 24 bits are a Company ID rather than an OUI: the IEEE
 * issues a CID with the U/L bit set and the I/G bit clear, so a CID-derived
 * address can never be confused with a registry assignment.
 *
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function isEuiCid(address: BitAddress): boolean {
	return isEuiLocal(address) && isEuiIndividual(address);
}

/**
 * The Company ID of a locally administered individual address.
 *
 * @returns `null` when the address carries an OUI instead.
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function euiCid(address: BitAddress): number | null {
	return isEuiCid(address) ? euiOui(address) : null;
}

/**
 * The address's OUI as a 24-bit prefix over the same width, so it can be
 * compared with `bitPrefixContains` against other addresses.
 *
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function euiOuiPrefix(address: BitAddress): BitPrefix {
	assertEuiWidth(address);

	return createBitPrefix(address, OUI_BIT_LENGTH);
}

/**
 * The block an IEEE assignment occupies, as a prefix over the same width: 24
 * bits for MA-L, 28 for MA-M, 36 for MA-S.
 *
 * Which block an address actually belongs to is only knowable from the IEEE
 * registry, which this package deliberately does not carry — the caller says
 * which block it is looking up.
 *
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function euiAssignmentPrefix(
	address: BitAddress,
	block: EuiAssignmentBlock,
): BitPrefix {
	assertEuiWidth(address);

	return createBitPrefix(address, EUI_ASSIGNMENT_BLOCK_BIT_LENGTHS[block]);
}

/**
 * Whether every bit is set — the broadcast address of its width.
 *
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function isEuiBroadcast(address: BitAddress): boolean {
	assertEuiWidth(address);

	return bitAddressIsAllOnes(address);
}

/**
 * Whether every bit is clear — the null address of its width.
 *
 * @throws RangeError When the address is neither 48 nor 64 bits wide.
 */
export function isEuiNull(address: BitAddress): boolean {
	assertEuiWidth(address);

	return bitAddressIsZero(address);
}
