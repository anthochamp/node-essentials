import { encodeText, type TextEncodingName } from "@ac-kit/core";

import type { Encoder } from "../encoder.js";

export type LineEncoderOptions = {
	endline?: "\r\n" | "\n";
};

/**
 * Creates the write half of CRLF line framing: each value is emitted with a
 * `\r\n` terminator.
 *
 * A factory rather than a class because nothing here changes after construction
 * — unlike {@link LineDecoder}, which carries a scan position across partial
 * lines.
 */
export function createLineEncoder(
	encoding: TextEncodingName,
	options?: LineEncoderOptions,
): Encoder<string> {
	const endline = options?.endline ?? "\r\n";

	return {
		encode(value: string): Uint8Array {
			return encodeText(`${value}${endline}`, encoding);
		},
	};
}
