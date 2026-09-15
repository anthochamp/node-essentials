import { decodeAll, TextBuffer } from "@ac-kit/format-core";

import { CsvRowDecoder } from "./csv-row-decoder.js";
import type { CsvOptions } from "./types.js";

/**
 * Parses RFC 4180 CSV text into rows of raw string fields.
 *
 * A utility over {@link CsvRowDecoder}, not a second implementation of the
 * grammar. Lenient on line endings: accepts `\r\n` or bare `\n` regardless of
 * `options.newline`, which only controls what `stringifyCsv` produces.
 * `options.header` has no effect here — the return type carries no header/body
 * distinction, so a caller that used `header: true` slices off `result[0]`
 * itself.
 */
export function parseCsv(text: string, options?: CsvOptions): string[][] {
	if (text.length === 0) {
		return [];
	}
	const result = decodeAll<string[], string, string, Error>(
		new CsvRowDecoder(options),
		text,
		{ buffer: new TextBuffer(text.length) },
	);
	return result.items.map((item) => item.value);
}
