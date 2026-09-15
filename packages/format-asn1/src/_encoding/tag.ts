import { ByteBuilder, ByteReader } from "@ac-kit/core";
import { encodeVlq } from "@ac-kit/format-varint";

import { TagClass } from "../index.js";
import {
	TAG_CLASS_APPLICATION,
	TAG_CLASS_CONTEXT,
	TAG_CLASS_PRIVATE,
	TAG_CLASS_UNIVERSAL,
	TAG_CONSTRUCTED,
	TAG_LONG_FORM,
	TAG_PRIMITIVE,
} from "./constants.js";
import { DecodingError } from "./errors.js";
import { readVlqField } from "./vlq.js";

/**
 * A resolved tag as it appears in the identifier octets (X.690 §8.1.2): class +
 * number plus the constructed/primitive bit. Distinct from the schema-level
 * `Tag` (class + number only) because `constructed` is derived from the type
 * and tagging mode at encode time, never authored directly.
 */
export interface EncodedTag {
	readonly tagClass: TagClass;
	readonly tagNumber: number;
	readonly constructed: boolean;
}

// ── Tag encoding ─────────────────────────────────────────────────────

/** Encode a tag into identifier octets (X.690 §8.1.2). */
export function encodeTag(tag: EncodedTag): Uint8Array {
	const classByte = tagClassToByte(tag.tagClass);
	const constructedBit = tag.constructed ? TAG_CONSTRUCTED : TAG_PRIMITIVE;
	const w = new ByteBuilder();

	if (tag.tagNumber < 31) {
		// Short form: single octet
		w.writeByte(classByte | constructedBit | tag.tagNumber);
	} else {
		// Long form: first octet has 0x1F, subsequent encode the number in base-128
		w.writeByte(classByte | constructedBit | TAG_LONG_FORM);
		const vlq = encodeVlq(tag.tagNumber);
		w.write(vlq);
	}
	return w.toBytes();
}

/** Decode identifier octets from a ByteReader (X.690 §8.1.2). */
export function decodeTag(reader: ByteReader): EncodedTag {
	const offset = reader.position;
	const first = reader.readByte();
	const tagClass = byteToTagClass((first & 0xc0) as 0 | 0x40 | 0x80 | 0xc0);
	const constructed = (first & TAG_CONSTRUCTED) !== 0;
	let tagNumber = first & 0x1f;

	if (tagNumber === 31) {
		tagNumber = readVlqField(reader, "Tag number", offset);
	}
	return { tagClass, tagNumber, constructed };
}

// ── Length encoding ───────────────────────────────────────────────────────────

/** Encode a definite length (X.690 §8.1.3.3). */
export function encodeDefiniteLength(len: number): Uint8Array {
	if (len < 0x80) {
		return new Uint8Array([len]);
	}
	// Long form: 0x8n followed by n bytes of length (big-endian)
	const bytes: number[] = [];
	let remaining = len;
	while (remaining > 0) {
		bytes.unshift(remaining & 0xff);
		remaining >>>= 8;
	}
	return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

/** Encode indefinite-length terminator: two 0x00 bytes (X.690 §8.1.3.6). */
export const EOC_BYTES: Uint8Array = new Uint8Array([0x00, 0x00]);

/** Indefinite-length octet (X.690 §8.1.3.6 — BER/CER only). */
export const INDEFINITE_LENGTH_BYTE = 0x80;

/** Decode a length from a ByteReader. Returns `undefined` for indefinite form. */
export function decodeLength(reader: ByteReader): number | undefined {
	const first = reader.readByte();
	if (first < 0x80) return first; // short form
	if (first === 0x80) return undefined; // indefinite form
	if (first === 0xff)
		throw new DecodingError("Reserved length octet 0xFF", reader.position);
	const numBytes = first & 0x7f;
	let len = 0;
	for (let i = 0; i < numBytes; i++) {
		len = (len << 8) | reader.readByte();
	}
	return len;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tagClassToByte(cls: TagClass): number {
	switch (cls) {
		case "universal":
			return TAG_CLASS_UNIVERSAL;
		case "application":
			return TAG_CLASS_APPLICATION;
		case "context":
			return TAG_CLASS_CONTEXT;
		case "private":
			return TAG_CLASS_PRIVATE;
	}
}

function byteToTagClass(b: 0 | 0x40 | 0x80 | 0xc0): TagClass {
	switch (b) {
		case TAG_CLASS_UNIVERSAL:
			return "universal";
		case TAG_CLASS_APPLICATION:
			return "application";
		case TAG_CLASS_CONTEXT:
			return "context";
		case TAG_CLASS_PRIVATE:
			return "private";
	}
}
