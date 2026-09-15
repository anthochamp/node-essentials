import type { ByteReader } from "@ac-kit/core";

import {
	CONTINUATION_BIT,
	MAX_SAFE_PREFIX,
	PAYLOAD_MASK,
	RADIX,
} from "../_base128.js";
import { VarintIncompleteError, VarintMalformedError } from "../errors.js";

/**
 * Reads one base-128 VLQ from `reader`, advancing it past the bytes consumed.
 *
 * Allocates nothing: the cursor carries the position, so a caller decoding a
 * run of values (an OID's arcs, a MIDI track's delta times) pays one
 * `ByteReader` for the run rather than one result object per value.
 *
 * Rejects an overlong encoding — a leading `0x80` byte, whose payload group is
 * zero — because X.690 §8.19.2 requires the fewest possible octets, and an
 * accepted overlong form would let two byte sequences mean the same number.
 *
 * Time complexity: O(log₁₂₈ value).
 *
 * @param reader - Cursor positioned at the first byte of the encoding.
 * @returns The decoded value, from 0 to `Number.MAX_SAFE_INTEGER`.
 * @throws {VarintIncompleteError} When the bytes run out while a continuation
 *   bit is still set.
 * @throws {VarintMalformedError} When the encoding is overlong.
 * @throws {RangeError} When the value is too large for a `number`. X.660 puts
 *   no ceiling on an OID arc, so such an encoding is well-formed and
 *   {@link readBigVlq} reads it — the limit is this function's return type, not
 *   the data.
 */
export function readVlq(reader: ByteReader): number {
	if (reader.atEnd) {
		throw new VarintIncompleteError("readVlq: no bytes to read");
	}

	let byte = reader.readByte();

	if (byte === CONTINUATION_BIT) {
		throw new VarintMalformedError(
			"readVlq: overlong encoding, leading byte 0x80 has an empty payload",
		);
	}

	let value = byte & PAYLOAD_MASK;

	while ((byte & CONTINUATION_BIT) !== 0) {
		if (reader.atEnd) {
			throw new VarintIncompleteError(
				"readVlq: continuation bit set on the last available byte",
			);
		}

		if (value > MAX_SAFE_PREFIX) {
			throw new RangeError(
				"readVlq: value exceeds Number.MAX_SAFE_INTEGER; use readBigVlq for a wider value",
			);
		}

		byte = reader.readByte();
		value = value * RADIX + (byte & PAYLOAD_MASK);
	}

	return value;
}
