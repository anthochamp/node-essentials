import { ByteReader } from "@ac-kit/core";
import {
	DECODE_INCOMPLETE,
	type DecodeResult,
	type Decoder,
} from "@ac-kit/format-core";

import { VarintIncompleteError } from "../errors.js";
import { readVlq } from "./read-vlq.js";

/**
 * A base-128 VLQ as a streaming {@link Decoder}.
 *
 * A VLQ delimits itself — the extent is only known once a byte without the
 * continuation bit arrives — so a truncated sequence is `incomplete` rather
 * than an error, and `needAtLeast` is deliberately omitted: a decoder that
 * cannot see the end cannot compute a floor better than "one more byte".
 *
 * Stateless, so one instance serves every caller and `reset` is unnecessary.
 *
 * A malformed sequence is `fatal`: an overlong or out-of-range value means the
 * byte stream is not what it claimed to be, and there is no length to
 * resynchronise past. Callers reading a VLQ from inside an already-framed
 * region — ASN.1 tag numbers and OID arcs, where an enclosing TLV bounds the
 * value — want {@link readVlq} instead, where running out of bytes is a
 * malformed frame rather than a request for more input.
 */
export const vlqDecoder: Decoder<number> = {
	decode(view: Uint8Array): DecodeResult<number> {
		const reader = new ByteReader(view);

		try {
			const value = readVlq(reader);

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
