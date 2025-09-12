import type { EncodingName } from "chardet";

/**
 * Convert a charset name as returned by chardet to a Node.js supported charset name.
 *
 * @see https://github.com/runk/node-chardet#supported-encodings
 *
 * @param chardetCharset Charset name as returned by chardet.
 * @returns Charset name supported by Node.js, or null if not supported.
 */
export function chardetCharsetToBufferEncoding(
	chardetCharset: EncodingName,
): BufferEncoding | null {
	switch (chardetCharset) {
		case "UTF-8":
			return "utf8";
		case "UTF-16LE":
			return "utf16le";
		case "ISO-8859-1":
			return "latin1";
		case "ASCII":
			return "ascii";

		default:
			break;
	}
	return null;
}
