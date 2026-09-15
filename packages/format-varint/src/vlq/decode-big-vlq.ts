import { ByteReader } from "@ac-kit/core";

import { VarintMalformedError } from "../errors.js";
import { readBigVlq } from "./read-big-vlq.js";

/**
 * Decodes a buffer holding exactly one base-128 VLQ as a `bigint` — the
 * unbounded counterpart of {@link decodeVlq}.
 *
 * @param bytes - A buffer holding one complete encoding and nothing else.
 * @returns The decoded value, zero or greater.
 * @throws {VarintIncompleteError} When the encoding is truncated.
 * @throws {VarintMalformedError} When the encoding is overlong, or followed by
 *   unread bytes.
 */
export function decodeBigVlq(bytes: Uint8Array): bigint {
	const reader = new ByteReader(bytes);
	const value = readBigVlq(reader);

	if (!reader.atEnd) {
		throw new VarintMalformedError(
			`decodeBigVlq: ${reader.remaining} byte(s) left after a complete value`,
		);
	}

	return value;
}
