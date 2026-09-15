import { ByteReader, concatBytes, decodeText } from "@ac-kit/core";
import { bigIntFromBytesBe } from "@ac-kit/math-integer";

import { DecodingError } from "../_encoding/errors.js";
import {
	encodeDefiniteLength,
	encodeTag,
	type EncodedTag,
} from "../_encoding/tag.js";
import { readAllTlv, readTlv } from "../_encoding/tlv.js";
import {
	decodeGeneralizedTime,
	decodeOid,
	decodeReal,
	decodeRelativeOid,
	decodeUtcTime,
} from "../_encoding/values.js";
import { universalTagFor } from "../ber.js";
import { DefValueOf } from "../schema/def.js";
import { AnyAsn1TypeDef } from "../schema/types/any-def.js";
import type { Asn1TaggedTypeDef } from "../schema/types/base.js";
import type { Asn1ChoiceTypeDef } from "../schema/types/constructed/choice.js";
import type { Asn1ComponentDef } from "../schema/types/constructed/component.js";
import type { Asn1SequenceTypeDef } from "../schema/types/constructed/sequence.js";
import type { Asn1SetTypeDef } from "../schema/types/constructed/set.js";

/** CER decoder — handles both definite and indefinite-length forms. */
export function cerDecode<D extends AnyAsn1TypeDef>(
	def: D,
	bytes: Uint8Array,
): DefValueOf<D> {
	return cerDecodeReader(def, new ByteReader(bytes)) as DefValueOf<D>;
}

function cerDecodeReader(def: AnyAsn1TypeDef, reader: ByteReader): unknown {
	if (def.kind === "lazy") return cerDecodeReader(def.getter(), reader);
	if (def.kind === "transform") {
		const decoded = cerDecodeReader(def.innerType, reader);
		return (def.fn ?? ((v: unknown) => v))(decoded);
	}
	if (def.kind === "choice") return decodeChoice(def, reader);
	if (def.kind === "tagged") return decodeTagged(def, reader);

	if (def.kind === "any") {
		const { tag, contents } = readTlv(reader);
		return {
			encoded: concatBytes(
				encodeTag(tag),
				encodeDefiniteLength(contents.length),
				contents,
			),
		};
	}

	const { tag, contents } = readTlv(reader);
	const expected = universalTagFor(def);
	if (
		expected &&
		(tag.tagClass !== "universal" || tag.tagNumber !== expected.tagNumber)
	) {
		throw new DecodingError(
			`CER: expected UNIVERSAL ${expected.tagNumber}, got ${tag.tagClass} ${tag.tagNumber}`,
			reader.position,
		);
	}
	return cerDecodeContents(def, tag, contents);
}

function cerDecodeContents(
	def: AnyAsn1TypeDef,
	tag: EncodedTag,
	contents: Uint8Array,
): unknown {
	switch (def.kind) {
		case "boolean":
			return contents[0] !== 0x00;
		case "integer":
		case "enumerated":
			return bigIntFromBytesBe(contents);

		case "bitString": {
			if (tag.constructed) {
				// Reassemble chunked bit string
				const chunks = readAllTlv(contents);
				const allBytes: number[] = [];
				let unusedBits = 0;
				for (let i = 0; i < chunks.length; i++) {
					unusedBits = chunks[i]!.contents[0]!;
					allBytes.push(...chunks[i]!.contents.slice(1));
				}
				return { bytes: new Uint8Array(allBytes), unusedBits };
			}
			if (contents.length === 0)
				return { bytes: new Uint8Array(0), unusedBits: 0 };
			return { bytes: contents.slice(1), unusedBits: contents[0]! };
		}

		case "octetString": {
			if (tag.constructed) {
				// Reassemble chunked octet string
				const chunks = readAllTlv(contents);
				const parts = chunks.map((c) => c.contents);
				const total = parts.reduce((n, p) => n + p.length, 0);
				const out = new Uint8Array(total);
				let offset = 0;
				for (const p of parts) {
					out.set(p, offset);
					offset += p.length;
				}
				return out;
			}
			return contents.slice();
		}

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
			return tag.constructed
				? cerReassembleString(contents, (b) =>
						decodeText(b, "utf-8", { fatal: true }),
					)
				: decodeText(contents, "utf-8", { fatal: true });
		case "numericString":
		case "printableString":
		case "teletexString":
		case "videotexString":
		case "ia5String":
		case "graphicString":
		case "visibleString":
		case "generalString":
			return tag.constructed
				? cerReassembleString(contents, (b) => decodeText(b, "latin1"))
				: decodeText(contents, "latin1");
		case "universalString":
			return tag.constructed
				? cerReassembleString(contents, (b) => decodeText(b, "utf-32be"))
				: decodeText(contents, "utf-32be");
		case "bmpString":
			return tag.constructed
				? cerReassembleString(contents, (b) => decodeText(b, "utf-16be"))
				: decodeText(contents, "utf-16be");

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
			return cerDecodeSequenceContents(def, contents);
		case "sequenceOf":
			return cerDecodeOfContents(def.elementType, contents);
		case "setOf":
			return cerDecodeOfContents(def.elementType, contents);

		case "external":
		case "embeddedPdv":
		case "characterString":
			return contents.slice();
		case "lazy":
			return cerDecodeContents(def.getter(), tag, contents);
		case "transform":
			return cerDecodeContents(def.innerType, tag, contents);

		default:
			throw new DecodingError(`Cannot CER-decode def kind: ${def.kind}`);
	}
}

function cerReassembleString(
	contents: Uint8Array,
	decoder: (b: Uint8Array) => string,
): string {
	const chunks = readAllTlv(contents);
	return chunks.map((c) => decoder(c.contents)).join("");
}

function decodeTagged(def: Asn1TaggedTypeDef, reader: ByteReader): unknown {
	const { tag, contents } = readTlv(reader);
	if (
		tag.tagClass !== def.tag.tagClass ||
		tag.tagNumber !== def.tag.tagNumber
	) {
		throw new DecodingError(
			`CER: expected ${def.tag.tagClass} ${def.tag.tagNumber}`,
			reader.position,
		);
	}
	if (def.mode === "explicit")
		return cerDecodeReader(def.innerType, new ByteReader(contents));
	return cerDecodeContents(def.innerType, tag, contents);
}

function decodeChoice(def: Asn1ChoiceTypeDef, reader: ByteReader): unknown {
	const savedPos = reader.position;
	const { tag: nextTag } = readTlv(reader);
	reader.seek(savedPos);
	for (const alt of def.alternatives) {
		if (
			"kind" in alt &&
			(alt.kind === "extensionMarker" || alt.kind === "extensionAdditionGroup")
		)
			continue;
		const outerTag = resolveOuterTag(alt.type);
		if (
			outerTag &&
			outerTag.tagClass === nextTag.tagClass &&
			outerTag.tagNumber === nextTag.tagNumber
		) {
			return { kind: alt.name, value: cerDecodeReader(alt.type, reader) };
		}
	}
	throw new DecodingError(
		`CER: CHOICE no match for ${nextTag.tagClass} ${nextTag.tagNumber}`,
		reader.position,
	);
}

function cerDecodeSequenceContents(
	def: Asn1SequenceTypeDef | Asn1SetTypeDef,
	contents: Uint8Array,
): Record<string, unknown> {
	const reader = new ByteReader(contents);
	const result: Record<string, unknown> = {};
	for (const comp of def.components) {
		if (comp.kind === "extensionMarker" || comp.kind === "componentsOf")
			continue;
		if (comp.kind === "extensionAdditionGroup") {
			for (const inner of comp.components)
				cerDecodeComponentFrom(reader, inner, result);
			continue;
		}
		cerDecodeComponentFrom(reader, comp, result);
	}
	return result;
}

function cerDecodeComponentFrom(
	reader: ByteReader,
	comp: Asn1ComponentDef,
	result: Record<string, unknown>,
): void {
	if (reader.atEnd) {
		if (comp.optional || comp.defaultValue !== undefined) {
			if (comp.defaultValue !== undefined)
				result[comp.name] = comp.defaultValue;
			return;
		}
		throw new DecodingError(`CER: required component "${comp.name}" missing`);
	}
	const savedPos = reader.position;
	const { tag: nextTag } = readTlv(reader);
	reader.seek(savedPos);
	const outerTag = resolveOuterTag(comp.type);
	if (
		outerTag &&
		(outerTag.tagClass !== nextTag.tagClass ||
			outerTag.tagNumber !== nextTag.tagNumber)
	) {
		if (comp.optional || comp.defaultValue !== undefined) {
			if (comp.defaultValue !== undefined)
				result[comp.name] = comp.defaultValue;
			return;
		}
		throw new DecodingError(
			`CER: required component "${comp.name}" tag mismatch`,
		);
	}
	result[comp.name] = cerDecodeReader(comp.type, reader);
}

function cerDecodeOfContents(
	elementDef: AnyAsn1TypeDef,
	contents: Uint8Array,
): unknown[] {
	const reader = new ByteReader(contents);
	const result: unknown[] = [];
	while (!reader.atEnd) result.push(cerDecodeReader(elementDef, reader));
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
