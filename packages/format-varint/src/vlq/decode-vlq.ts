import { ByteReader } from "@ac-kit/core";

import { VarintMalformedError } from "../errors.js";
import { readVlq } from "./read-vlq.js";

/**
 * Decodes a buffer holding exactly one base-128 VLQ.
 *
 * The one-shot counterpart of {@link readVlq}, for a caller that already knows
 * the extent of the value. Decoding a run of values from one buffer is
 * {@link readVlq}'s job — it does not re-scan and does not allocate per value.
 *
 * @param bytes - A buffer holding one complete encoding and nothing else.
 * @returns The decoded value, from 0 to `Number.MAX_SAFE_INTEGER`.
 * @throws {VarintIncompleteError} When the encoding is truncated.
 * @throws {VarintMalformedError} When the encoding is overlong, out of range,
 *   or followed by unread bytes.
 */
export function decodeVlq(bytes: Uint8Array): number {
	const reader = new ByteReader(bytes);
	const value = readVlq(reader);

	if (!reader.atEnd) {
		throw new VarintMalformedError(
			`decodeVlq: ${reader.remaining} byte(s) left after a complete value`,
		);
	}

	return value;
}
