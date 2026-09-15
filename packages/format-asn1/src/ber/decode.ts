import { ByteReader, concatBytes, decodeText } from "@ac-kit/core";
import { bigIntFromBytesBe } from "@ac-kit/math-integer";

import { DecodingError } from "../_encoding/errors.js";
import type { EncodedTag } from "../_encoding/tag.js";
import { encodeDefiniteLength, encodeTag } from "../_encoding/tag.js";
import { readTlv } from "../_encoding/tlv.js";
import {
	decodeGeneralizedTime,
	decodeOid,
	decodeReal,
	decodeRelativeOid,
	decodeUtcTime,
} from "../_encoding/values.js";
import { DefValueOf } from "../schema/def.js";
import { AnyAsn1TypeDef } from "../schema/types/any-def.js";
import type { Asn1TaggedTypeDef } from "../schema/types/base.js";
import type { Asn1ChoiceTypeDef } from "../schema/types/constructed/choice.js";
import type {
	Asn1AlternativeDef,
	Asn1ComponentDef,
} from "../schema/types/constructed/component.js";
import type { Asn1SequenceTypeDef } from "../schema/types/constructed/sequence.js";
import type { Asn1SetTypeDef } from "../schema/types/constructed/set.js";
import { universalTagFor } from "./tags.js";

export interface BerDecodeOptions {
	/** If true, perform DER/CER canonicality checks and throw on violations. */
	readonly strict?: boolean;
}

/** BER decoder — reads one TLV from bytes and decodes it according to def. */
export function berDecode<D extends AnyAsn1TypeDef>(
	def: D,
	bytes: Uint8Array,
	opts: BerDecodeOptions = {},
): DefValueOf<D> {
	const reader = new ByteReader(bytes);
	return berDecodeReader(def, reader, opts) as DefValueOf<D>;
}

/**
 * BER decoder — reads one TLV from a ByteReader and decodes it according to
 * def.
 */
function berDecodeReader(
	def: AnyAsn1TypeDef,
	reader: ByteReader,
	opts: BerDecodeOptions,
): unknown {
	// Transparent wrappers
	if (def.kind === "lazy") {
		const inner = def.getter();
		return berDecodeReader(inner, reader, opts);
	}
	if (def.kind === "transform") {
		const decoded = berDecodeReader(def.innerType, reader, opts);
		const fn = def.fn ?? ((v: unknown) => v);
		return fn(decoded);
	}

	// CHOICE: peek at the next tag and dispatch
	if (def.kind === "choice") {
		return decodeChoice(def, reader, opts);
	}

	// Tagged types
	if (def.kind === "tagged") {
		return decodeTagged(def, reader, opts);
	}

	// ANY: consume the raw TLV and return it as { encoded: Uint8Array }
	if (def.kind === "any") {
		//const startPos = reader.position;
		const { tag, contents } = readTlv(reader);
		// Re-assemble the full TLV for the AnyValue
		const tagBytes = encodeTag(tag);
		const lenBytes = encodeDefiniteLength(contents.length);
		const encoded = concatBytes(tagBytes, lenBytes, contents);
		return { encoded };
	}

	// Normal types: read the TLV and verify the tag
	const { tag, contents } = readTlv(reader);
	const expectedTagInfo = universalTagFor(def);
	if (expectedTagInfo) {
		if (
			tag.tagClass !== "universal" ||
			tag.tagNumber !== expectedTagInfo.tagNumber
		) {
			throw new DecodingError(
				`Expected UNIVERSAL tag ${expectedTagInfo.tagNumber}, got ${tag.tagClass} ${tag.tagNumber}`,
				reader.position,
			);
		}
	}

	return decodeContents(def, contents, opts);
}

/** Decode the raw contents bytes (without TLV header) for a given def. */
function decodeContents(
	def: AnyAsn1TypeDef,
	contents: Uint8Array,
	opts: BerDecodeOptions,
): unknown {
	switch (def.kind) {
		case "boolean":
			if (opts.strict && contents[0] !== 0x00 && contents[0] !== 0xff) {
				throw new DecodingError("DER: BOOLEAN TRUE must be 0xFF");
			}
			return contents[0] !== 0x00;

		case "integer":
		case "enumerated":
			return bigIntFromBytesBe(contents);

		case "bitString": {
			if (contents.length === 0)
				return { bytes: new Uint8Array(0), unusedBits: 0 };
			const unusedBits = contents[0]!;
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
			return decodeSequenceContents(def, contents, opts);

		case "sequenceOf":
			return decodeOfContents(def.elementType, contents, opts);

		case "setOf":
			return decodeOfContents(def.elementType, contents, opts);

		case "external":
		case "embeddedPdv":
		case "characterString":
			return contents.slice();

		case "lazy": {
			const inner = def.getter();
			return decodeContents(inner, contents, opts);
		}

		case "transform":
			return decodeContents(def.innerType, contents, opts);

		default:
			throw new DecodingError(`Cannot BER-decode def kind: ${def.kind}`);
	}
}

function decodeTagged(
	def: Asn1TaggedTypeDef,
	reader: ByteReader,
	opts: BerDecodeOptions,
): unknown {
	const { tag, contents } = readTlv(reader);

	// Verify the outer tag matches the expected tagged tag
	const expectedClass = def.tag.tagClass;
	const expectedNum = def.tag.tagNumber;
	if (tag.tagClass !== expectedClass || tag.tagNumber !== expectedNum) {
		throw new DecodingError(
			`Expected ${expectedClass} tag ${expectedNum}, got ${tag.tagClass} ${tag.tagNumber}`,
			reader.position,
		);
	}

	if (def.mode === "explicit") {
		// Explicit: decode the inner TLV from the contents
		const innerReader = new ByteReader(contents);
		return berDecodeReader(def.innerType, innerReader, opts);
	}

	// Implicit: the contents ARE the inner value (tag was replaced)
	return decodeContents(def.innerType, contents, opts);
}

function decodeChoice(
	def: Asn1ChoiceTypeDef,
	reader: ByteReader,
	opts: BerDecodeOptions,
): unknown {
	// Peek at the next tag to find which alternative matches
	const savedPos = reader.position;
	const { tag: nextTag } = readTlv(reader);
	reader.seek(savedPos);

	for (const alt of def.alternatives) {
		if (
			"kind" in alt &&
			(alt.kind === "extensionMarker" || alt.kind === "extensionAdditionGroup")
		) {
			continue;
		}
		const altDef = alt as Asn1AlternativeDef;
		const altTag = resolveAltTag(altDef.type);
		if (altTag && tagsMatch(altTag, nextTag)) {
			const value = berDecodeReader(altDef.type, reader, opts);
			return { kind: altDef.name, value };
		}
	}

	// Try to decode as ANY if no match found
	throw new DecodingError(
		`CHOICE: no alternative matches tag ${nextTag.tagClass} ${nextTag.tagNumber}`,
		reader.position,
	);
}

/**
 * Resolve the outermost tag that would be produced for a given def (for CHOICE
 * tag matching).
 */
function resolveAltTag(
	def: AnyAsn1TypeDef,
): { tagClass: string; tagNumber: number } | undefined {
	if (def.kind === "tagged") {
		return { tagClass: def.tag.tagClass, tagNumber: def.tag.tagNumber };
	}
	if (def.kind === "lazy") {
		const inner = def.getter();
		return resolveAltTag(inner);
	}
	const info = universalTagFor(def);
	if (!info) return undefined;
	return { tagClass: "universal", tagNumber: info.tagNumber };
}

function tagsMatch(
	a: { tagClass: string; tagNumber: number },
	b: EncodedTag,
): boolean {
	return a.tagClass === b.tagClass && a.tagNumber === b.tagNumber;
}

function decodeSequenceContents(
	def: Asn1SequenceTypeDef | Asn1SetTypeDef,
	contents: Uint8Array,
	opts: BerDecodeOptions,
): Record<string, unknown> {
	const reader = new ByteReader(contents);
	const result: Record<string, unknown> = {};

	for (const comp of def.components) {
		if (comp.kind === "extensionMarker" || comp.kind === "componentsOf")
			continue;
		if (comp.kind === "extensionAdditionGroup") {
			for (const inner of comp.components) {
				decodeComponentFrom(reader, inner, result, opts);
			}
			continue;
		}
		decodeComponentFrom(reader, comp, result, opts);
	}

	return result;
}

function decodeComponentFrom(
	reader: ByteReader,
	comp: Asn1ComponentDef,
	result: Record<string, unknown>,
	opts: BerDecodeOptions,
): void {
	if (reader.atEnd) {
		if (comp.optional || comp.defaultValue !== undefined) return;
		throw new DecodingError(`Required component "${comp.name}" missing`);
	}

	// Peek at next tag to determine if this optional component is present
	const savedPos = reader.position;
	const { tag: nextTag } = readTlv(reader);
	reader.seek(savedPos);

	const expectedTag = resolveAltTag(comp.type);
	if (expectedTag && !tagsMatch(expectedTag, nextTag)) {
		if (comp.optional || comp.defaultValue !== undefined) {
			if (comp.defaultValue !== undefined)
				result[comp.name] = comp.defaultValue;
			return;
		}
		throw new DecodingError(`Required component "${comp.name}": tag mismatch`);
	}

	result[comp.name] = berDecodeReader(comp.type, reader, opts);
}

function decodeOfContents(
	elementDef: AnyAsn1TypeDef,
	contents: Uint8Array,
	opts: BerDecodeOptions,
): unknown[] {
	const reader = new ByteReader(contents);

	const result: unknown[] = [];
	while (!reader.atEnd) {
		result.push(berDecodeReader(elementDef, reader, opts));
	}
	return result;
}
