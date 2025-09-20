/**
 * Maps EditorConfig charset names to Node.js BufferEncoding names.
 *
 * @param charset An EditorConfig charset name.
 * @returns A Node.js BufferEncoding name, or null if the charset is not supported.
 */
export function editorconfigCharsetToBufferEncoding(
	charset: string,
): BufferEncoding | null {
	// https://editorconfig-specification.readthedocs.io/#supported-pairs
	switch (charset) {
		case "latin1":
			return "latin1";
		case "utf-8":
			return "utf8";
		case "utf-16le":
			return "utf16le";
		default:
			return null;
	}
}
