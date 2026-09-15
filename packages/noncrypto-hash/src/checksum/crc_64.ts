import { computeCrc64 } from "./_crc64-engine.js";
import { Crc64Options, Crc64Params } from "./crc-types.js";

/** CRC-64/XZ, aka CRC-64/GO-ECMA — the algorithm commonly misidentified as ECMA. */
export const CRC64_XZ = {
	polynomial: 0x42f0e1eba9ea3693n,
	init: 0xffffffffffffffffn,
	refIn: true,
	refOut: true,
	xorOut: 0xffffffffffffffffn,
} as const satisfies Crc64Params;

/** CRC-64/GO-ISO, the polynomial Go's `hash/crc64` package calls `crc64.ISO`. */
export const CRC64_ISO = {
	polynomial: 0x000000000000001bn,
	init: 0xffffffffffffffffn,
	refIn: true,
	refOut: true,
	xorOut: 0xffffffffffffffffn,
} as const satisfies Crc64Params;

/**
 * Computes a 64-bit CRC of `data` (CRC-64/XZ by default).
 *
 * Uses `bigint` arithmetic, so it is markedly slower than {@link crc_32} — use
 * it when a 64-bit checksum is required, not as a general-purpose choice.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to check.
 * @param options.preset - Which named parameter set to use, defaulting to
 *   {@link CRC64_XZ}.
 * @returns An unsigned 64-bit checksum.
 */
export function crc_64(data: Uint8Array, options?: Crc64Options): bigint {
	return computeCrc64(data, options?.preset ?? CRC64_XZ);
}
