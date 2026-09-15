import { ByteBuilder, ByteReader, concatBytes } from "@ac-kit/core";

import {
	decodeLength,
	decodeTag,
	encodeDefiniteLength,
	encodeTag,
	EOC_BYTES,
	INDEFINITE_LENGTH_BYTE,
	type EncodedTag,
} from "./tag.js";

export interface TlvHeader {
	readonly tag: EncodedTag;
	/** `undefined` = indefinite-length (BER/CER only). */
	readonly length: number | undefined;
	/** Byte offset of the value within the source buffer. */
	readonly valueOffset: number;
}

// ── Write ─────────────────────────────────────────────────────────────────────

/** Build a TLV with definite-length encoding. */
export function writeTlv(tag: EncodedTag, contents: Uint8Array): Uint8Array {
	return concatBytes(
		encodeTag(tag),
		encodeDefiniteLength(contents.length),
		contents,
	);
}

/** Build a TLV with indefinite-length encoding (BER/CER constructed types). */
export function writeTlvIndefinite(
	tag: EncodedTag,
	contents: Uint8Array,
): Uint8Array {
	return concatBytes(
		encodeTag(tag),
		new Uint8Array([INDEFINITE_LENGTH_BYTE]),
		contents,
		EOC_BYTES,
	);
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Read one TLV from a ByteReader. Returns the tag, the content slice, and the
 * reader positioned after this TLV.
 */
export function readTlv(reader: ByteReader): {
	tag: EncodedTag;
	contents: Uint8Array;
} {
	const tag = decodeTag(reader);
	const length = decodeLength(reader);

	if (length !== undefined) {
		const contents = reader.read(length);
		return { tag, contents };
	}

	// Indefinite-length: read until EOC (0x00 0x00)
	const w = new ByteBuilder();
	let depth = 1;
	while (!reader.atEnd) {
		const b0 = reader.readByte();
		if (b0 === 0x00 && reader.peekByte() === 0x00) {
			reader.readByte(); // consume the second 0x00
			depth--;
			if (depth === 0) break;
		}
		w.writeByte(b0);
	}
	return { tag, contents: w.toBytes() };
}

/** Read just the TLV header (tag + length) without consuming the value. */
export function readTlvHeader(reader: ByteReader): TlvHeader {
	const tag = decodeTag(reader);
	const length = decodeLength(reader);
	return { tag, length, valueOffset: reader.position };
}

/** Return all TLV elements from a buffer (for parsing constructed contents). */
export function readAllTlv(
	contents: Uint8Array,
): Array<{ tag: EncodedTag; contents: Uint8Array }> {
	const reader = new ByteReader(contents);
	const result: Array<{ tag: EncodedTag; contents: Uint8Array }> = [];
	while (!reader.atEnd) {
		result.push(readTlv(reader));
	}
	return result;
}

/**
 * Orders a tag for DER SET and SET OF sorting (X.690 §11.5-11.6).
 *
 * Class outranks tag number, and the constructed bit takes no part: a SET's
 * components are ordered by their tags, and a tag is its class and number. Tag
 * numbers are unbounded in principle, so this returns a `bigint` rather than
 * packing both into one 32-bit integer.
 */
export function tagSortKey(tag: EncodedTag): bigint {
	const classRank = { universal: 0, application: 1, context: 2, private: 3 }[
		tag.tagClass
	];
	return (BigInt(classRank) << 64n) | BigInt(tag.tagNumber);
}
