import {
	ByteBuilder,
	compareBytes,
	encodeTextLatin1,
	encodeTextUtf16Be,
	encodeTextUtf32Be,
	encodeTextUtf8,
} from "@ac-kit/core";
import { bigIntToBytesBe } from "@ac-kit/math-integer";

import { UNIVERSAL_TAG_OCTET_STRING } from "../_encoding/constants.js";
import { EncodingError } from "../_encoding/errors.js";
import { writeTlv, writeTlvIndefinite } from "../_encoding/tlv.js";
import {
	encodeBitString,
	encodeGeneralizedTime,
	encodeOid,
	encodeReal,
	encodeRelativeOid,
	encodeUtcTime,
} from "../_encoding/values.js";
import { taggedDefTag, universalTagFor } from "../ber.js";
import { DefInputOf } from "../schema/def.js";
import { AnyAsn1TypeDef } from "../schema/types/any-def.js";
import type { Asn1TaggedTypeDef } from "../schema/types/base.js";
import type { Asn1ChoiceTypeDef } from "../schema/types/constructed/choice.js";
import type {
	Asn1AlternativeDef,
	Asn1ComponentDef,
} from "../schema/types/constructed/component.js";
import type { Asn1SequenceTypeDef } from "../schema/types/constructed/sequence.js";
import type { Asn1SetTypeDef } from "../schema/types/constructed/set.js";
import { resolveInstance } from "../schema/types/parameterized/parameterized-type.js";
import {
	BitStringValue,
	GeneralizedTimeValue,
	RealValue,
	UtcTimeValue,
} from "../schema/values.js";

// CER string-chunking threshold: 1000 bytes (X.690 §9.2)
const CER_CHUNK_LIMIT = 1000;

/**
 * CER encoder — Canonical Encoding Rules (X.690 §9).
 *
 * CER differences from DER: - Constructed types > 1000 bytes use
 * indefinite-length encoding - String/octet types > 1000 bytes are chunked into
 * 1000-byte OCTET/BIT STRING primitives wrapped in a constructed form -
 * BOOLEAN: same as DER (TRUE = 0xFF) - SET: same as DER (components in
 * ascending tag order) - SET OF: same as DER (elements in lexicographic byte
 * order)
 */
export function cerEncode<D extends AnyAsn1TypeDef>(
	def: D,
	value: DefInputOf<D>,
): Uint8Array {
	return cerEncodeDef(def, value);
}

function cerEncodeDef(def: AnyAsn1TypeDef, value: unknown): Uint8Array {
	if (def.kind === "lazy") return cerEncodeDef(def.getter(), value);
	if (def.kind === "transform") return cerEncodeDef(def.innerType, value);
	if (def.kind === "parameterizedTypeInstance")
		return cerEncodeDef(resolveInstance(def), value);
	if (def.kind === "tagged") return cerEncodeTagged(def, value);

	// Handle byte/string types that require CER chunking for large values
	if (def.kind === "octetString")
		return cerEncodeByteString(UNIVERSAL_TAG_OCTET_STRING, value as Uint8Array);

	const tagInfo = universalTagFor(def);
	if (!tagInfo) {
		// CHOICE or other no-tag types
		return cerEncodeContents(def, value);
	}

	// String types: encode then possibly chunk
	if (isStringType(def.kind)) {
		const bytes = cerEncodeContents(def, value);
		return cerEncodeByteString(tagInfo.tagNumber, bytes);
	}

	const contents = cerEncodeContents(def, value);
	const tag = {
		tagClass: "universal" as const,
		tagNumber: tagInfo.tagNumber,
		constructed: tagInfo.constructed,
	};
	if (tagInfo.constructed && contents.length > CER_CHUNK_LIMIT) {
		return writeTlvIndefinite(tag, contents);
	}
	return writeTlv(tag, contents);
}

function cerEncodeTagged(def: Asn1TaggedTypeDef, value: unknown): Uint8Array {
	const inner = def.innerType;
	const innerTagInfo = universalTagFor(inner);
	const innerConstructed = innerTagInfo?.constructed ?? false;
	const tag = taggedDefTag(def, innerConstructed);

	if (def.mode === "explicit") {
		const innerEncoded = cerEncodeDef(inner, value);
		if (tag.constructed && innerEncoded.length > CER_CHUNK_LIMIT) {
			return writeTlvIndefinite(tag, innerEncoded);
		}
		return writeTlv(tag, innerEncoded);
	}
	const contents = cerEncodeContents(inner, value);
	if (tag.constructed && contents.length > CER_CHUNK_LIMIT) {
		return writeTlvIndefinite(tag, contents);
	}
	return writeTlv(tag, contents);
}

function cerEncodeContents(def: AnyAsn1TypeDef, value: unknown): Uint8Array {
	switch (def.kind) {
		case "boolean":
			return new Uint8Array([(value as boolean) ? 0xff : 0x00]);
		case "integer":
		case "enumerated":
			return bigIntToBytesBe(value as bigint);

		case "bitString":
			return encodeBitString(value as BitStringValue);

		case "octetString":
			return value as Uint8Array; // handled by cerEncodeByteString above

		case "null":
			return new Uint8Array(0);
		case "objectIdentifier":
			return encodeOid(value as readonly number[]);
		case "relativeOid":
			return encodeRelativeOid(value as readonly number[]);
		case "oidIri":
		case "relativeOidIri":
			return encodeTextUtf8(value as string);
		case "real":
			return encodeReal(value as RealValue);
		case "any":
			return (value as any)?.encoded ?? new Uint8Array(0);

		case "utf8String":
			return encodeTextUtf8(value as string);
		case "numericString":
		case "printableString":
		case "teletexString":
		case "videotexString":
		case "ia5String":
		case "graphicString":
		case "visibleString":
		case "generalString":
			return encodeTextLatin1(value as string);
		case "universalString":
			return encodeTextUtf32Be(value as string);
		case "bmpString":
			return encodeTextUtf16Be(value as string);

		case "utcTime":
			return encodeUtcTime(value as UtcTimeValue);
		case "generalizedTime":
			return encodeGeneralizedTime(value as GeneralizedTimeValue);
		case "time":
		case "date":
		case "timeOfDay":
		case "dateTime":
		case "duration":
			return encodeTextLatin1(value as string);

		case "sequence":
			return cerEncodeSequenceContents(def, value as Record<string, unknown>);
		case "set":
			return cerEncodeSetContents(def, value as Record<string, unknown>);
		case "sequenceOf":
			return cerEncodeOfContents(def.elementType, value as unknown[]);
		case "setOf":
			return cerEncodeSetOfContents(def.elementType, value as unknown[]);
		case "choice":
			return cerEncodeChoice(def, value as { kind: string; value: unknown });

		case "external":
		case "embeddedPdv":
		case "characterString":
			return value instanceof Uint8Array ? value : new Uint8Array(0);
		case "lazy":
			return cerEncodeContents(def.getter(), value);
		case "transform":
			return cerEncodeContents(def.innerType, value);

		default:
			throw new EncodingError(`Cannot CER-encode def kind: ${def.kind}`);
	}
}

/** Encode a byte string with CER chunking if > 1000 bytes. */
function cerEncodeByteString(tagNumber: number, bytes: Uint8Array): Uint8Array {
	if (bytes.length <= CER_CHUNK_LIMIT) {
		return writeTlv(
			{ tagClass: "universal", tagNumber, constructed: false },
			bytes,
		);
	}
	// Large: constructed indefinite-length with 1000-byte chunks
	const w = new ByteBuilder();
	let offset = 0;
	while (offset < bytes.length) {
		const chunk = bytes.subarray(offset, offset + CER_CHUNK_LIMIT);
		w.write(
			writeTlv({ tagClass: "universal", tagNumber, constructed: false }, chunk),
		);
		offset += CER_CHUNK_LIMIT;
	}
	return writeTlvIndefinite(
		{ tagClass: "universal", tagNumber, constructed: true },
		w.toBytes(),
	);
}

function isStringType(kind: string): boolean {
	return [
		"utf8String",
		"numericString",
		"printableString",
		"teletexString",
		"videotexString",
		"ia5String",
		"graphicString",
		"visibleString",
		"generalString",
		"universalString",
		"bmpString",
	].includes(kind);
}

function cerEncodeSequenceContents(
	def: Asn1SequenceTypeDef,
	value: Record<string, unknown>,
): Uint8Array {
	const w = new ByteBuilder();
	for (const comp of def.components) {
		if (comp.kind === "extensionMarker" || comp.kind === "componentsOf")
			continue;
		if (comp.kind === "extensionAdditionGroup") {
			for (const inner of comp.components)
				cerEncodeComponentTo(w, inner, value);
			continue;
		}
		cerEncodeComponentTo(w, comp, value);
	}
	return w.toBytes();
}

function cerEncodeSetContents(
	def: Asn1SetTypeDef,
	value: Record<string, unknown>,
): Uint8Array {
	// CER SET: same tag ordering as DER
	const encoded: Array<{ sortKey: number; bytes: Uint8Array }> = [];
	for (const comp of def.components) {
		if (comp.kind === "extensionMarker" || comp.kind === "componentsOf")
			continue;
		if (comp.kind === "extensionAdditionGroup") {
			for (const inner of comp.components) {
				const v = value[inner.name];
				if (
					v === undefined &&
					(inner.optional || inner.defaultValue !== undefined)
				)
					continue;
				if (v === undefined)
					throw new EncodingError(
						`Required SET component "${inner.name}" missing`,
					);
				const bytes = cerEncodeDef(inner.type, v);
				const sb = sortKeyFromTlv(bytes);
				encoded.push({ sortKey: sb, bytes });
			}
			continue;
		}
		const v = value[comp.name];
		if (v === undefined && (comp.optional || comp.defaultValue !== undefined))
			continue;
		if (v === undefined)
			throw new EncodingError(`Required SET component "${comp.name}" missing`);
		const bytes = cerEncodeDef(comp.type, v);
		encoded.push({ sortKey: sortKeyFromTlv(bytes), bytes });
	}
	encoded.sort((a, b) => a.sortKey - b.sortKey);
	const w = new ByteBuilder();
	for (const { bytes } of encoded) w.write(bytes);
	return w.toBytes();
}

function cerEncodeComponentTo(
	w: ByteBuilder,
	comp: Asn1ComponentDef,
	value: Record<string, unknown>,
): void {
	const v = value[comp.name];
	if (v === undefined) {
		if (comp.optional || comp.defaultValue !== undefined) return;
		throw new EncodingError(`Required component "${comp.name}" missing`);
	}
	w.write(cerEncodeDef(comp.type, v));
}

function cerEncodeOfContents(
	elementDef: AnyAsn1TypeDef,
	values: unknown[],
): Uint8Array {
	const w = new ByteBuilder();
	for (const v of values) w.write(cerEncodeDef(elementDef, v));
	return w.toBytes();
}

function cerEncodeSetOfContents(
	elementDef: AnyAsn1TypeDef,
	values: unknown[],
): Uint8Array {
	const encoded = values.map((v) => cerEncodeDef(elementDef, v));
	encoded.sort(compareBytes);
	const w = new ByteBuilder();
	for (const e of encoded) w.write(e);
	return w.toBytes();
}

function cerEncodeChoice(
	def: Asn1ChoiceTypeDef,
	value: { kind: string; value: unknown },
): Uint8Array {
	for (const alt of def.alternatives) {
		if (
			"kind" in alt &&
			(alt.kind === "extensionMarker" || alt.kind === "extensionAdditionGroup")
		)
			continue;
		const altDef = alt as Asn1AlternativeDef;
		if (altDef.name === value.kind)
			return cerEncodeDef(altDef.type, value.value);
	}
	throw new EncodingError(`Unknown CHOICE alternative: "${value.kind}"`);
}

function sortKeyFromTlv(tlv: Uint8Array): number {
	const byte = tlv[0]!;
	const classNum = byte & 0xc0;
	const classOrder =
		classNum === 0 ? 0 : classNum === 0x40 ? 1 : classNum === 0x80 ? 2 : 3;
	const tagNum = byte & 0x1f;
	return (classOrder << 16) | tagNum;
}
