/**
 * Text encodings {@link encodeText}/{@link decodeText} support without a
 * platform-specific decoder.
 *
 * `"utf-8"` and `"utf-16be"` are backed by a real `TextDecoder` instance (see
 * {@link decodeText}'s `options` for their `fatal`/`ignoreBOM` support);
 * `"utf-8"` is also the only encoding `encodeText` can use a real `TextEncoder`
 * for, since `TextEncoder` itself only ever produces UTF-8.
 *
 * `"latin1"`/`"ascii"` are one byte per UTF-16 code unit (`"ascii"`
 * additionally masks the high bit, matching Node's `Buffer` behaviour) —
 * deliberately _not_ the WHATWG Encoding Standard's `"latin1"`/`"ascii"`
 * labels, which that standard defines as aliases for windows-1252, not true
 * ISO-8859-1/ASCII (see {@link DecodeTextOptions}'s doc for why that matters
 * here). `"utf-32be"` is four bytes per Unicode code point, big-endian (ASN.1
 * `UniversalString`) — deliberately outside the WHATWG Encoding Standard, which
 * excludes UTF-32 entirely.
 */
export type TextEncodingName =
	| "utf-8"
	| "latin1"
	| "ascii"
	| "utf-16be"
	| "utf-32be";
