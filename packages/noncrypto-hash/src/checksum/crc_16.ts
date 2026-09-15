import { computeCrc } from "./_crc-engine.js";
import { CrcOptions, CrcParams } from "./crc-types.js";

/** Historically misidentified as plain "CCITT" — see {@link CRC16_KERMIT}. */
export const CRC16_CCITT_FALSE = {
	width: 16,
	polynomial: 0x1021,
	init: 0xffff,
	refIn: false,
	refOut: false,
	xorOut: 0x0000,
} as const satisfies CrcParams;

/** The MSB-first V.41 form — XMODEM, ZMODEM, Acorn MOS. */
export const CRC16_XMODEM = {
	width: 16,
	polynomial: 0x1021,
	init: 0x0000,
	refIn: false,
	refOut: false,
	xorOut: 0x0000,
} as const satisfies CrcParams;

/** CRC presented low byte first. */
export const CRC16_MODBUS = {
	width: 16,
	polynomial: 0x8005,
	init: 0xffff,
	refIn: true,
	refOut: true,
	xorOut: 0x0000,
} as const satisfies CrcParams;

export const CRC16_USB = {
	width: 16,
	polynomial: 0x8005,
	init: 0xffff,
	refIn: true,
	refOut: true,
	xorOut: 0xffff,
} as const satisfies CrcParams;

/** The LSB-first V.41 form, the one actually implemented in Kermit. */
export const CRC16_KERMIT = {
	width: 16,
	polynomial: 0x1021,
	init: 0x0000,
	refIn: true,
	refOut: true,
	xorOut: 0x0000,
} as const satisfies CrcParams;

/**
 * Computes a 16-bit CRC of `data` (CRC-16/CCITT-FALSE by default).
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to check.
 * @param options.preset - Which named parameter set to use, defaulting to
 *   {@link CRC16_CCITT_FALSE}.
 * @returns An unsigned 16-bit checksum.
 */
export function crc_16(data: Uint8Array, options?: CrcOptions): number {
	return computeCrc(data, options?.preset ?? CRC16_CCITT_FALSE);
}
