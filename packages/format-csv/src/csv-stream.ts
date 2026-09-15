import { BYTES_PER_MIB } from "@ac-kit/core";
import {
	DecodeStream,
	EncodeStream,
	TextDecodeBuffer,
} from "@ac-kit/format-core";

import { CsvRowDecoder } from "./csv-row-decoder.js";
import { createCsvRowEncoder } from "./csv-row-encoder.js";
import type { CsvCell, CsvOptions } from "./types.js";

export type CsvParseStreamOptions = CsvOptions & {
	/**
	 * Hard ceiling on undecoded retained text, in UTF-16 code units. A single
	 * record larger than this throws `BufferOverflowError`. Defaults to 1 MiB.
	 */
	readonly maxBufferSize?: number;
};

/**
 * Parses a CSV byte stream, emitting one row of raw string fields per record.
 *
 * For files too large to hold in memory at once; `parseCsv` is the whole-text
 * face of the same decoder.
 */
export class CsvParseStream extends DecodeStream<string[], string, Uint8Array> {
	constructor(options: CsvParseStreamOptions = {}) {
		super(new CsvRowDecoder(options), {
			buffer: new TextDecodeBuffer(options.maxBufferSize ?? BYTES_PER_MIB),
		});
	}
}

/** Serializes rows of cells as CSV text, one terminated record per row. */
export class CsvPrintStream extends EncodeStream<readonly CsvCell[], string> {
	constructor(options?: CsvOptions) {
		super(createCsvRowEncoder(options));
	}
}
