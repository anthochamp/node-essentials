import { BYTES_PER_MIB } from "@ac-kit/core";
import { DecodeStream, TextDecodeBuffer } from "@ac-kit/format-core";

import type { IniNode } from "./ast.js";
import { IniLineDecoder } from "./ini-line-codec.js";
import type { IniParseOptions } from "./parse-ini-document.js";

/** Options for {@link IniParseStream}. */
export type IniParseStreamOptions = IniParseOptions & {
	/**
	 * Hard ceiling on undecoded retained text, in UTF-16 code units. Defaults to
	 * 1 MiB.
	 */
	readonly maxBufferSize?: number;
};

/**
 * Parses an INI byte stream, emitting one {@link IniNode} per line.
 *
 * Line spans are relative to their own line; use `parseIniDocument` where
 * document-absolute offsets are needed.
 */
export class IniParseStream extends DecodeStream<IniNode, string, Uint8Array> {
	constructor(options: IniParseStreamOptions = {}) {
		super(new IniLineDecoder(options), {
			buffer: new TextDecodeBuffer(options.maxBufferSize ?? BYTES_PER_MIB),
		});
	}
}
