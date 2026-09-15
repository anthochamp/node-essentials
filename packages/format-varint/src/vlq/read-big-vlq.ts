import type { ByteReader } from "@ac-kit/core";

import { CONTINUATION_BIT, PAYLOAD_BITS, PAYLOAD_MASK } from "../_base128.js";
import { VarintIncompleteError, VarintMalformedError } from "../errors.js";

/**
 * Reads one base-128 VLQ from `reader` as a `bigint`, advancing it past the
 * bytes consumed — the unbounded counterpart of {@link readVlq}.
 *
 * Has no range limit to report: X.660 caps no OID arc, and a `bigint` holds
 * whatever the bytes say. Prefer {@link readVlq} wherever the value is known to
 * fit a `number`; `bigint` arithmetic is markedly slower and allocates.
 *
 * Time complexity: O(log₁₂₈ value).
 *
 * @param reader - Cursor positioned at the first byte of the encoding.
 * @returns The decoded value, zero or greater.
 * @throws {VarintIncompleteError} When the bytes run out while a continuation
 *   bit is still set.
 * @throws {VarintMalformedError} When the encoding is overlong.
 */
export function readBigVlq(reader: ByteReader): bigint {
	if (reader.atEnd) {
		throw new VarintIncompleteError("readBigVlq: no bytes to read");
	}

	let byte = reader.readByte();

	if (byte === CONTINUATION_BIT) {
		throw new VarintMalformedError(
			"readBigVlq: overlong encoding, leading byte 0x80 has an empty payload",
		);
	}

	let value = BigInt(byte & PAYLOAD_MASK);

	while ((byte & CONTINUATION_BIT) !== 0) {
		if (reader.atEnd) {
			throw new VarintIncompleteError(
				"readBigVlq: continuation bit set on the last available byte",
			);
		}

		byte = reader.readByte();
		value = (value << PAYLOAD_BITS) | BigInt(byte & PAYLOAD_MASK);
	}

	return value;
}
