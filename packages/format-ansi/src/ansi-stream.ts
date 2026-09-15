import { BYTES_PER_MIB } from "@ac-kit/core";
import {
	DecodeStream,
	EncodeStream,
	TextDecodeBuffer,
} from "@ac-kit/format-core";

import { AnsiDecoder } from "./ansi-decoder.js";
import { createAnsiEncoder } from "./ansi-encoder.js";
import type { AnsiToken } from "./ansi-token.js";

/** Options for {@link AnsiParseStream}. */
export type AnsiParseStreamOptions = {
	/**
	 * Hard ceiling on undecoded retained text, in UTF-16 code units. Defaults to
	 * 1 MiB.
	 */
	readonly maxBufferSize?: number;
};

/**
 * Splits a terminal byte stream into {@link AnsiToken}s, reassembling escape
 * sequences split across chunk boundaries.
 */
export class AnsiParseStream extends DecodeStream<
	AnsiToken,
	string,
	Uint8Array
> {
	constructor(options: AnsiParseStreamOptions = {}) {
		super(new AnsiDecoder(), {
			buffer: new TextDecodeBuffer(options.maxBufferSize ?? BYTES_PER_MIB),
		});
	}
}

/** Renders {@link AnsiToken}s back to escape-sequence text. */
export class AnsiPrintStream extends EncodeStream<AnsiToken, string> {
	constructor() {
		super(createAnsiEncoder());
	}
}
