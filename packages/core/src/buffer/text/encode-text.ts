import type { TextEncodingName } from "./text-encoding-name.js";

/**
 * Encode text as bytes.
 *
 * @param text - Source string.
 * @param encoding - Text encoding.
 * @returns The encoded bytes.
 */
export function encodeText(
	text: string,
	encoding: TextEncodingName,
): Uint8Array<ArrayBuffer> {
	switch (encoding) {
		case "utf-8":
			return encodeTextUtf8(text);
		case "utf-16be":
			return encodeTextUtf16Be(text);
		case "utf-32be":
			return encodeTextUtf32Be(text);
		case "ascii":
			return encodeTextAscii(text);
		case "latin1":
			return encodeTextLatin1(text);
	}
}

const utf8Encoder_ = new TextEncoder();

export function encodeTextUtf8(text: string): Uint8Array<ArrayBuffer> {
	return utf8Encoder_.encode(text);
}

export function encodeTextAscii(text: string): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(text.length);
	for (let index = 0; index < text.length; index++) {
		out[index] = text.charCodeAt(index) & 0x7f;
	}
	return out;
}

export function encodeTextLatin1(text: string): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(text.length);
	for (let index = 0; index < text.length; index++) {
		out[index] = text.charCodeAt(index) & 0xff;
	}
	return out;
}

export function encodeTextUtf16Be(text: string): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(text.length * 2);
	for (let index = 0; index < text.length; index++) {
		const unit = text.charCodeAt(index);
		out[index * 2] = (unit >>> 8) & 0xff;
		out[index * 2 + 1] = unit & 0xff;
	}
	return out;
}

export function encodeTextUtf32Be(text: string): Uint8Array<ArrayBuffer> {
	const codePoints = Array.from(text, (c) => c.codePointAt(0) ?? 0);
	const out = new Uint8Array(codePoints.length * 4);
	for (let index = 0; index < codePoints.length; index++) {
		const codePoint = codePoints[index]!;
		out[index * 4] = (codePoint >>> 24) & 0xff;
		out[index * 4 + 1] = (codePoint >>> 16) & 0xff;
		out[index * 4 + 2] = (codePoint >>> 8) & 0xff;
		out[index * 4 + 3] = codePoint & 0xff;
	}
	return out;
}
