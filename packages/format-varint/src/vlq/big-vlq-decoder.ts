import { ByteReader } from "@ac-kit/core";
import {
	DECODE_INCOMPLETE,
	type DecodeResult,
	type Decoder,
} from "@ac-kit/format-core";

import { VarintIncompleteError } from "../errors.js";
import { readBigVlq } from "./read-big-vlq.js";

/**
 * A base-128 VLQ as a streaming {@link Decoder} producing `bigint` — the
 * unbounded counterpart of {@link vlqDecoder}.
 *
 * Same framing behaviour: a VLQ delimits itself, so a truncated sequence is
 * `incomplete` with no `needAtLeast` floor better than "one more byte", and an
 * overlong encoding is `fatal`. Unlike {@link vlqDecoder} it has no range to
 * exceed, so the only fatal outcome is a malformed sequence.
 *
 * Stateless, so one instance serves every caller and `reset` is unnecessary.
 */
export const bigVlqDecoder: Decoder<bigint> = {
	decode(view: Uint8Array): DecodeResult<bigint> {
		const reader = new ByteReader(view);

		try {
			const value = readBigVlq(reader);

			return { status: "decoded", value, consumed: reader.position };
		} catch (error) {
			if (error instanceof VarintIncompleteError) {
				return DECODE_INCOMPLETE;
			}

			return {
				status: "fatal",
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	},
};
