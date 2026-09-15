import { TextEncodingName } from "@ac-kit/core";

import type { Codec } from "../codec.js";
import { LineDecoder, type LineDecoderOptions } from "./line-decoder.js";
import { createLineEncoder } from "./line-encoder.js";

export type LineCodecOptions = LineDecoderOptions;

/**
 * Creates the CRLF-delimited line codec: one string per `\n`-terminated line on
 * the way in, a `\r\n` terminator on the way out.
 *
 * This is the framing for SMTP, LMTP, IMAP, POP3, IRC and most other text
 * command protocols. Use {@link LineDecoder} or {@link createLineEncoder}
 * directly where only one direction is needed; a `FrameLink` needs both.
 *
 * Stateful across partial lines, so an instance must back exactly one driver.
 */
export function createLineCodec(
	encoding: TextEncodingName,
	options?: LineCodecOptions,
): Codec<string> {
	const decoder = new LineDecoder(encoding, options);
	const encoder = createLineEncoder(encoding);

	return {
		decode: (view) => decoder.decode(view),
		encode: (value) => encoder.encode(value),
		reset: () => {
			decoder.reset();
		},
	};
}
