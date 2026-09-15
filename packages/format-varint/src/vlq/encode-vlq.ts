import { vlqByteLength } from "./vlq-byte-length.js";
import { writeVlq } from "./write-vlq.js";

/**
 * Encodes a non-negative integer as a base-128 VLQ, most significant group
 * first, with the continuation bit set on every byte but the last.
 *
 * Used by ASN.1 X.690 for tag numbers (§8.1.2.4) and OID arcs (§8.19.2), and by
 * Standard MIDI Files for delta times. DWARF, WebAssembly and Protocol Buffers
 * use the little-endian LEB128 member of the same family instead, which this is
 * not interchangeable with.
 *
 * Time complexity: O(log₁₂₈ value).
 *
 * @param value - A non-negative safe integer.
 * @returns A fresh buffer holding the encoding, never empty.
 * @throws {RangeError} When `value` is negative, fractional, or beyond
 *   `Number.MAX_SAFE_INTEGER`.
 */
export function encodeVlq(value: number): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(vlqByteLength(value));
	writeVlq(out, 0, value);

	return out;
}
