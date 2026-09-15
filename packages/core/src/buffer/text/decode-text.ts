import type { TextEncodingName } from "./text-encoding-name.js";

/**
 * Options mirroring `TextDecoderOptions` (see `TextDecoder`).
 *
 * Only `"utf-8"` and `"utf-16be"` honor both options — they are the only two
 * encodings here backed by a real `TextDecoder` instance, and per the WHATWG
 * Encoding Standard, BOM handling and the fatal/replacement error modes are
 * likewise only defined for UTF-8 and UTF-16BE/LE.
 *
 * `"latin1"`/`"ascii"` ignore both options: they are deliberately _not_ the
 * WHATWG-spec `"latin1"`/`"ascii"` labels, which the standard defines as
 * aliases for windows-1252 (remapping bytes 0x80-0x9F to printable characters)
 * — these decode every byte 1:1 to its own code point instead, matching true
 * ISO-8859-1/ASCII. Neither option has a meaning for that mapping: every byte
 * is valid, and there is no byte order mark for a single-byte encoding.
 *
 * `"utf-32be"` ignores `ignoreBOM` (no byte order mark exists for a
 * 4-byte-per-code-point scheme) but honors `fatal`, since a 4-byte group can
 * still decode to a surrogate or an out-of-range value.
 */
export type DecodeTextOptions = {
	/**
	 * When `true`, throw a `TypeError` on invalid input instead of substituting
	 * U+FFFD. Defaults to `false`, matching `TextDecoder`.
	 */
	fatal?: boolean;

	/**
	 * When `false` (the default), a leading byte order mark is consumed and
	 * dropped rather than decoded as U+FEFF. Defaults to `false`, matching
	 * `TextDecoder`.
	 */
	ignoreBOM?: boolean;
};

const utf8Decoders = new Map<string, TextDecoder>();
const utf16BeDecoders = new Map<string, TextDecoder>();

// `TextDecoder` construction is not free; a decoder only depends on
// (label, fatal, ignoreBOM), so one instance per combination is reused across
// every call instead of rebuilding it per call.
function getCachedDecoder(
	cache: Map<string, TextDecoder>,
	label: string,
	fatal: boolean,
	ignoreBOM: boolean,
): TextDecoder {
	const key = `${fatal}:${ignoreBOM}`;
	let decoder = cache.get(key);

	if (!decoder) {
		decoder = new TextDecoder(label, { fatal, ignoreBOM });
		cache.set(key, decoder);
	}

	return decoder;
}

/**
 * Decode bytes as text. Copies, so the result does not alias the input.
 *
 * @param bytes - Source bytes.
 * @param encoding - Text encoding.
 * @param options - See {@link DecodeTextOptions}.
 * @returns The decoded string.
 * @throws {TypeError} When `options.fatal` is `true` and `bytes` is not valid
 *   for `encoding`. Never thrown for `"latin1"`/`"ascii"`, for which every byte
 *   is valid.
 */
export function decodeText(
	bytes: Uint8Array,
	encoding: TextEncodingName,
	options?: DecodeTextOptions,
): string {
	const fatal = options?.fatal ?? false;
	const ignoreBOM = options?.ignoreBOM ?? false;

	if (encoding === "utf-8") {
		return getCachedDecoder(utf8Decoders, "utf-8", fatal, ignoreBOM).decode(
			bytes,
		);
	}

	if (encoding === "utf-16be") {
		return getCachedDecoder(
			utf16BeDecoders,
			"utf-16be",
			fatal,
			ignoreBOM,
		).decode(bytes);
	}

	if (encoding === "utf-32be") {
		let out = "";
		for (let index = 0; index + 3 < bytes.length; index += 4) {
			const codePoint =
				((bytes[index]! << 24) |
					(bytes[index + 1]! << 16) |
					(bytes[index + 2]! << 8) |
					bytes[index + 3]!) >>>
				0;

			if (
				codePoint > 0x10ffff ||
				(codePoint >= 0xd800 && codePoint <= 0xdfff)
			) {
				if (fatal) {
					throw new TypeError(
						`decodeText: invalid utf-32be code point 0x${codePoint.toString(16)}`,
					);
				}
				out += "\ufffd";
				continue;
			}

			out += String.fromCodePoint(codePoint);
		}
		return out;
	}

	// latin1 and ascii are both one byte per code unit; ascii additionally masks
	// the high bit, matching Node's Buffer behaviour — deliberately not the
	// WHATWG "latin1"/"ascii" labels (windows-1252); see this function's doc.
	const mask = encoding === "ascii" ? 0x7f : 0xff;
	let out = "";
	for (let index = 0; index < bytes.length; index++) {
		out += String.fromCharCode(bytes[index]! & mask);
	}
	return out;
}
