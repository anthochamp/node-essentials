import { decodeAll, TextBuffer } from "@ac-kit/format-core";

import { AnsiDecoder } from "./ansi-decoder.js";
import type { AnsiToken } from "./ansi-token.js";

/**
 * Strips ANSI/VT100 escape sequences (SGR colors, cursor moves, OSC 8 links).
 *
 * A utility over {@link AnsiDecoder}: every token that is not text is dropped.
 * Handles CSI (`ESC [` and the 8-bit introducer) and OSC (`ESC ]`, terminated
 * by BEL or ST). An unterminated sequence at the end of the input is kept, on
 * the grounds that it is indistinguishable from ordinary text at that point.
 */
export function stripAnsiEscapes(text: string): string {
	if (text.length === 0) {
		return text;
	}
	const result = decodeAll<AnsiToken, string, string, Error>(
		new AnsiDecoder(),
		text,
		{ buffer: new TextBuffer(text.length) },
	);

	let out = "";
	for (const item of result.items) {
		if (item.value.kind === "text") {
			out += item.value.text;
		}
	}
	return out;
}
