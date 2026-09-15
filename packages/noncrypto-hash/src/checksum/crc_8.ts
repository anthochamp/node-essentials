import { computeCrc } from "./_crc-engine.js";
import { CrcOptions, CrcParams } from "./crc-types.js";

/** Plain CRC-8, aka CRC-8/SMBUS. */
export const CRC8 = {
	width: 8,
	polynomial: 0x07,
	init: 0x00,
	refIn: false,
	refOut: false,
	xorOut: 0x00,
} as const satisfies CrcParams;

export const CRC8_SAE_J1850 = {
	width: 8,
	polynomial: 0x1d,
	init: 0xff,
	refIn: false,
	refOut: false,
	xorOut: 0xff,
} as const satisfies CrcParams;

/** Dallas/Maxim 1-Wire device registration numbers. */
export const CRC8_MAXIM = {
	width: 8,
	polynomial: 0x31,
	init: 0x00,
	refIn: true,
	refOut: true,
	xorOut: 0x00,
} as const satisfies CrcParams;

/** ATM Header Error Control — aka CRC-8/ITU. */
export const CRC8_CCITT = {
	width: 8,
	polynomial: 0x07,
	init: 0x00,
	refIn: false,
	refOut: false,
	xorOut: 0x55,
} as const satisfies CrcParams;

/**
 * Computes an 8-bit CRC of `data` (plain CRC-8 by default).
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to check.
 * @param options.preset - Which named parameter set to use, defaulting to
 *   {@link CRC8}.
 * @returns An unsigned 8-bit checksum.
 */
export function crc_8(data: Uint8Array, options?: CrcOptions): number {
	return computeCrc(data, options?.preset ?? CRC8);
}
