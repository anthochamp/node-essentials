import { computeCrc } from "./_crc-engine.js";
import { CrcOptions, CrcParams } from "./crc-types.js";

/** The default: zip, PNG, Ethernet, gzip. */
export const CRC32_ISO_HDLC = {
	width: 32,
	polynomial: 0x04c11db7,
	init: 0xffffffff,
	refIn: true,
	refOut: true,
	xorOut: 0xffffffff,
} as const satisfies CrcParams;

/** Castagnoli — iSCSI, ext4, SCTP. */
export const CRC32C = {
	width: 32,
	polynomial: 0x1edc6f41,
	init: 0xffffffff,
	refIn: true,
	refOut: true,
	xorOut: 0xffffffff,
} as const satisfies CrcParams;

/**
 * Computes a 32-bit CRC of `data` (CRC-32/ISO-HDLC by default, CRC-32C on
 * request).
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to check.
 * @param options.preset - Which named parameter set to use, defaulting to
 *   {@link CRC32_ISO_HDLC}.
 * @returns An unsigned 32-bit checksum.
 */
export function crc_32(data: Uint8Array, options?: CrcOptions): number {
	return computeCrc(data, options?.preset ?? CRC32_ISO_HDLC);
}
