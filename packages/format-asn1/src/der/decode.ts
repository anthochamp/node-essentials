import {
	ByteReader,
	bigIntFromBytesBe,
	concatBytes,
	decodeText,
	setRecordEntry,
} from "@ac-kit/core";

import { DecodingError } from "../_encoding/errors.js";
import { encodeDefiniteLength, encodeTag } from "../_encoding/tag.js";
import { readTlv } from "../_encoding/tlv.js";
import {
	decodeGeneralizedTime,
	decodeOid,
	decodeReal,
	decodeRelativeOid,
	decodeUtcTime,
} from "../_encoding/values.js";
import { universalTagFor } from "../ber.js";
import { DefValueOf } from "../schema/def.js";
import { Tag } from "../schema/metadata.js";
import { AnyAsn1TypeDef } from "../schema/types/any-def.js";
import type { Asn1TaggedTypeDef } from "../schema/types/base.js";
import type { Asn1ChoiceTypeDef } from "../schema/types/constructed/choice.js";
import type { Asn1ComponentDef } from "../schema/types/constructed/component.js";
import type { Asn1SequenceTypeDef } from "../schema/types/constructed/sequence.js";
import type { Asn1SetTypeDef } from "../schema/types/constructed/set.js";

/**
 * DER decoder — decodes DER-encoded bytes with canonicality validation. By
 * default, enforces DER rules (strict = true).
 */
export function derDecode<D extends AnyAsn1TypeDef>(
	def: D,
	bytes: Uint8Array,
	strict = true,
): DefValueOf<D> {
	const reader = new ByteReader(bytes);
	return derDecodeReader(def, reader, strict) as DefValueOf<D>;
}

function derDecodeReader(
	def: AnyAsn1TypeDef,
	reader: ByteReader,
	strict: boolean,
): unknown {
	if (def.kind === "lazy") return derDecodeReader(def.getter(), reader, strict);
	if (def.kind === "transform") {
		const decoded = derDecodeReader(def.innerType, reader, strict);
		const fn = def.fn ?? ((v: unknown) => v);
		return fn(decoded);
	}
	if (def.kind === "choice") return decodeChoice(def, reader, strict);
	if (def.kind === "tagged") return decodeTagged(def, reader, strict);

	if (def.kind === "any") {
		const { tag, contents } = readTlv(reader);
		const tagBytes = encodeTag(tag);
		const lenBytes = encodeDefiniteLength(contents.length);
		return { encoded: concatBytes(tagBytes, lenBytes, contents) };
	}

	const { tag, contents } = readTlv(reader);
	validateTag(def, tag, reader.position);
	return derDecodeContents(def, contents, strict);
}

function validateTag(def: AnyAsn1TypeDef, tag: Tag, pos: number): void {
	const expected = universalTagFor(def);
	if (!expected) return;
	if (tag.tagClass !== "universal" || tag.tagNumber !== expected.tagNumber) {
		throw new DecodingError(
			`DER: expected UNIVERSAL ${expected.tagNumber}, got ${tag.tagClass} ${tag.tagNumber}`,
			pos,
		);
	}
}

export function derDecodeContents(
	def: AnyAsn1TypeDef,
	contents: Uint8Array,
	strict: boolean,
): unknown {
	switch (def.kind) {
		case "boolean":
			if (strict && contents[0] !== 0x00 && contents[0] !== 0xff) {
				throw new DecodingError("DER: BOOLEAN TRUE must be encoded as 0xFF");
			}
			return contents[0] !== 0x00;

		case "integer":
		case "enumerated":
			return bigIntFromBytesBe(contents);

		case "bitString": {
			if (contents.length === 0)
				throw new DecodingError(
					"DER: BIT STRING must have at least 1 content octet",
				);
			const unusedBits = contents[0]!;
			// Trailing zero check only applies when unusedBits > 0 (X.690 §11.2)
			// When unusedBits = 0, all bytes are meaningful data (e.g. RSA signature)
			if (
				strict &&
				unusedBits > 0 &&
				contents.length > 1 &&
				contents[contents.length - 1] === 0x00
			) {
				throw new DecodingError(
					"DER: BIT STRING has trailing zero bytes with unused bits > 0",
				);
			}
			return { bytes: contents.slice(1), unusedBits };
		}

		case "octetString":
			return contents.slice();
		case "null":
			return null;
		case "objectIdentifier":
			return decodeOid(contents);
		case "relativeOid":
			return decodeRelativeOid(contents);
		case "oidIri":
		case "relativeOidIri":
			return decodeText(contents, "utf-8", { fatal: true });
		case "real":
			return decodeReal(contents);
		case "any":
			return { encoded: contents.slice() };

		case "utf8String":
			return decodeText(contents, "utf-8", { fatal: true });
		case "numericString":
		case "printableString":
		case "teletexString":
		case "videotexString":
		case "ia5String":
		case "graphicString":
		case "visibleString":
		case "generalString":
			return decodeText(contents, "latin1");
		case "universalString":
			return decodeText(contents, "utf-32be");
		case "bmpString":
			return decodeText(contents, "utf-16be");

		case "utcTime":
			return decodeUtcTime(contents);
		case "generalizedTime":
			return decodeGeneralizedTime(contents);
		case "time":
		case "date":
		case "timeOfDay":
		case "dateTime":
		case "duration":
			return decodeText(contents, "latin1");

		case "sequence":
		case "set":
			return decodeSequenceContents(def, contents, strict);
		case "sequenceOf":
			return decodeOfContents(def.elementType, contents, strict);
		case "setOf":
			return decodeOfContents(def.elementType, contents, strict);

		case "external":
		case "embeddedPdv":
		case "characterString":
			return contents.slice();
		case "lazy":
			return derDecodeContents(def.getter(), contents, strict);
		case "transform":
			return derDecodeContents(def.innerType, contents, strict);

		default:
			throw new DecodingError(`Cannot DER-decode def kind: ${def.kind}`);
	}
}

function decodeTagged(
	def: Asn1TaggedTypeDef,
	reader: ByteReader,
	strict: boolean,
): unknown {
	const { tag, contents } = readTlv(reader);
	if (
		tag.tagClass !== def.tag.tagClass ||
		tag.tagNumber !== def.tag.tagNumber
	) {
		throw new DecodingError(
			`DER: expected ${def.tag.tagClass} ${def.tag.tagNumber}, got ${tag.tagClass} ${tag.tagNumber}`,
			reader.position,
		);
	}
	if (def.mode === "explicit") {
		const innerReader = new ByteReader(contents);
		return derDecodeReader(def.innerType, innerReader, strict);
	}
	return derDecodeContents(def.innerType, contents, strict);
}

function decodeChoice(
	def: Asn1ChoiceTypeDef,
	reader: ByteReader,
	strict: boolean,
): unknown {
	const savedPos = reader.position;
	const { tag: nextTag } = readTlv(reader);
	reader.seek(savedPos);

	for (const alt of def.alternatives) {
		if (
			"kind" in alt &&
			(alt.kind === "extensionMarker" || alt.kind === "extensionAdditionGroup")
		)
			continue;
		const altTag = resolveOuterTag(alt.type);
		if (altTag && tagsMatch(altTag, nextTag)) {
			return {
				kind: alt.name,
				value: derDecodeReader(alt.type, reader, strict),
			};
		}
	}
	throw new DecodingError(
		`DER: CHOICE no match for ${nextTag.tagClass} ${nextTag.tagNumber}`,
		reader.position,
	);
}

function decodeSequenceContents(
	def: Asn1SequenceTypeDef | Asn1SetTypeDef,
	contents: Uint8Array,
	strict: boolean,
): Record<string, unknown> {
	const reader = new ByteReader(contents);
	const result: Record<string, unknown> = {};
	for (const comp of def.components) {
		if (comp.kind === "extensionMarker" || comp.kind === "componentsOf")
			continue;
		if (comp.kind === "extensionAdditionGroup") {
			for (const inner of comp.components)
				decodeComponentFrom(reader, inner, result, strict);
			continue;
		}
		decodeComponentFrom(reader, comp, result, strict);
	}
	return result;
}

function decodeComponentFrom(
	reader: ByteReader,
	comp: Asn1ComponentDef,
	result: Record<string, unknown>,
	strict: boolean,
): void {
	if (reader.atEnd) {
		if (comp.optional || comp.defaultValue !== undefined) {
			if (comp.defaultValue !== undefined)
				setRecordEntry(result, comp.name, comp.defaultValue);
			return;
		}
		throw new DecodingError(`DER: required component "${comp.name}" missing`);
	}
	const savedPos = reader.position;
	const { tag: nextTag } = readTlv(reader);
	reader.seek(savedPos);

	const expectedTag = resolveOuterTag(comp.type);
	if (expectedTag && !tagsMatch(expectedTag, nextTag)) {
		if (comp.optional || comp.defaultValue !== undefined) {
			if (comp.defaultValue !== undefined)
				setRecordEntry(result, comp.name, comp.defaultValue);
			return;
		}
		throw new DecodingError(
			`DER: required component "${comp.name}" has wrong tag`,
		);
	}
	setRecordEntry(result, comp.name, derDecodeReader(comp.type, reader, strict));
}

function decodeOfContents(
	elementDef: AnyAsn1TypeDef,
	contents: Uint8Array,
	strict: boolean,
): unknown[] {
	const reader = new ByteReader(contents);
	const result: unknown[] = [];
	while (!reader.atEnd)
		result.push(derDecodeReader(elementDef, reader, strict));
	return result;
}

function resolveOuterTag(
	def: AnyAsn1TypeDef,
): { tagClass: string; tagNumber: number } | undefined {
	if (def.kind === "tagged")
		return { tagClass: def.tag.tagClass, tagNumber: def.tag.tagNumber };
	if (def.kind === "lazy") return resolveOuterTag(def.getter());
	const info = universalTagFor(def);
	return info
		? { tagClass: "universal", tagNumber: info.tagNumber }
		: undefined;
}

function tagsMatch(
	a: { tagClass: string; tagNumber: number },
	b: Tag,
): boolean {
	return a.tagClass === b.tagClass && a.tagNumber === b.tagNumber;
}
