import {
	ByteBuilder,
	compareBytes,
	encodeTextLatin1,
	encodeTextUtf16Be,
	encodeTextUtf32Be,
	encodeTextUtf8,
} from "@ac-kit/core";
import { bigIntToBytesBe } from "@ac-kit/math-integer";

import { EncodingError } from "../_encoding/errors.js";
import type { EncodedTag } from "../_encoding/tag.js";
import { tagSortKey, writeTlv } from "../_encoding/tlv.js";
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
import type { Asn1ComponentDef } from "../schema/types/constructed/component.js";
import type { Asn1SequenceTypeDef } from "../schema/types/constructed/sequence.js";
import type { Asn1SetTypeDef } from "../schema/types/constructed/set.js";
import { resolveInstance } from "../schema/types/parameterized/parameterized-type.js";
import { AnyValue, BitStringValue, RealValue } from "../schema/values.js";

/**
 * DER encoder — produces canonical, minimal-length TLV output.
 *
 * DER rules beyond BER (X.690 §11): - Definite-length only (no indefinite
 * forms) - BOOLEAN TRUE = 0xFF - BIT STRING: no trailing zero bytes in the
 * contents - SET components in ascending tag order - SET OF elements in
 * ascending lexicographic byte order - DEFAULT values are omitted from
 * SEQUENCE/SET encoding
 */
export function derEncode<D extends AnyAsn1TypeDef>(
	def: D,
	value: DefInputOf<D>,
): Uint8Array {
	return derEncodeDef(def, value);
}

function derEncodeDef(def: AnyAsn1TypeDef, value: unknown): Uint8Array {
	if (def.kind === "lazy") return derEncodeDef(def.getter(), value);
	if (def.kind === "transform") return derEncodeDef(def.innerType, value);
	if (def.kind === "parameterizedTypeInstance")
		return derEncodeDef(resolveInstance(def), value);
	if (def.kind === "tagged") return derEncodeTagged(def, value);

	const contents = derEncodeContents(def, value);
	const tagInfo = universalTagFor(def);
	if (!tagInfo) return contents; // CHOICE: already wrapped
	return writeTlv(
		{
			tagClass: "universal",
			tagNumber: tagInfo.tagNumber,
			constructed: tagInfo.constructed,
		},
		contents,
	);
}

function derEncodeTagged(def: Asn1TaggedTypeDef, value: unknown): Uint8Array {
	const inner = def.innerType;
	const innerTagInfo = universalTagFor(inner);
	const innerConstructed = innerTagInfo?.constructed ?? false;
	const tag = taggedDefTag(def, innerConstructed);

	if (def.mode === "explicit") {
		return writeTlv(tag, derEncodeDef(inner, value));
	}
	return writeTlv(tag, derEncodeContents(inner, value));
}

function derEncodeContents(def: AnyAsn1TypeDef, value: unknown): Uint8Array {
	switch (def.kind) {
		case "boolean":
			// DER: FALSE = 0x00, TRUE = 0xFF (X.690 §11.1)
			return new Uint8Array([(value as boolean) ? 0xff : 0x00]);

		case "integer":
		case "enumerated":
			return bigIntToBytesBe(value as bigint);

		case "bitString":
			return encodeBitString(value as BitStringValue);

		case "octetString":
			return value as Uint8Array;
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

		case "any": {
			const anyVal = value as AnyValue;
			return anyVal?.encoded ?? new Uint8Array(0);
		}

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

		// DER time: UTCTime = YYMMDDHHMMSSZ, GeneralizedTime = YYYYMMDDHHMMSS[.fff]Z
		case "utcTime":
			return encodeUtcTime(value as any);
		case "generalizedTime":
			return encodeGeneralizedTime(value as any);
		case "time":
		case "date":
		case "timeOfDay":
		case "dateTime":
		case "duration":
			return encodeTextLatin1(value as string);

		case "sequence":
			return derEncodeSequenceContents(def, value as Record<string, unknown>);
		case "set":
			return derEncodeSetContents(def, value as Record<string, unknown>);
		case "sequenceOf":
			return derEncodeOfContents(def.elementType, value as unknown[]);
		case "setOf":
			return derEncodeSetOfContents(def.elementType, value as unknown[]);
		case "choice":
			return derEncodeChoice(def, value as { kind: string; value: unknown });

		case "external":
		case "embeddedPdv":
		case "characterString":
			return value instanceof Uint8Array ? value : new Uint8Array(0);

		case "lazy":
			return derEncodeContents(def.getter(), value);
		case "transform":
			return derEncodeContents(def.innerType, value);

		default:
			throw new EncodingError(`Cannot DER-encode def kind: ${def.kind}`);
	}
}

function derEncodeSequenceContents(
	def: Asn1SequenceTypeDef,
	value: Record<string, unknown>,
): Uint8Array {
	const w = new ByteBuilder();
	for (const comp of def.components) {
		if (comp.kind === "extensionMarker" || comp.kind === "componentsOf")
			continue;
		if (comp.kind === "extensionAdditionGroup") {
			for (const inner of comp.components)
				derEncodeComponentTo(w, inner, value);
			continue;
		}
		derEncodeComponentTo(w, comp, value);
	}
	return w.toBytes();
}

function derEncodeSetContents(
	def: Asn1SetTypeDef,
	value: Record<string, unknown>,
): Uint8Array {
	// DER SET: encode each component, then sort by tag (X.690 §11.6)
	const encoded: Array<{ sortKey: bigint; bytes: Uint8Array }> = [];
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
				const bytes = derEncodeDef(inner.type, v);
				encoded.push({ sortKey: tagSortKey(getFirstTag(bytes)), bytes });
			}
			continue;
		}
		const v = value[comp.name];
		if (v === undefined && (comp.optional || comp.defaultValue !== undefined))
			continue;
		if (v === undefined)
			throw new EncodingError(`Required SET component "${comp.name}" missing`);
		const bytes = derEncodeDef(comp.type, v);
		encoded.push({ sortKey: tagSortKey(getFirstTag(bytes)), bytes });
	}
	encoded.sort((a, b) =>
		a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0,
	);
	const w = new ByteBuilder();
	for (const { bytes } of encoded) w.write(bytes);
	return w.toBytes();
}

function derEncodeComponentTo(
	w: ByteBuilder,
	comp: Asn1ComponentDef,
	value: Record<string, unknown>,
): void {
	const v = value[comp.name];
	if (v === undefined) {
		if (comp.optional) return;
		if (comp.defaultValue !== undefined) return; // DER omits DEFAULT values
		throw new EncodingError(`Required component "${comp.name}" is missing`);
	}
	w.write(derEncodeDef(comp.type, v));
}

function derEncodeOfContents(
	elementDef: AnyAsn1TypeDef,
	values: unknown[],
): Uint8Array {
	const w = new ByteBuilder();
	for (const v of values) w.write(derEncodeDef(elementDef, v));
	return w.toBytes();
}

function derEncodeSetOfContents(
	elementDef: AnyAsn1TypeDef,
	values: unknown[],
): Uint8Array {
	// DER SET OF: encode each element then sort lexicographically (X.690 §11.6)
	const encoded = values.map((v) => derEncodeDef(elementDef, v));
	encoded.sort(compareBytes);
	const w = new ByteBuilder();
	for (const e of encoded) w.write(e);
	return w.toBytes();
}

function derEncodeChoice(
	def: Asn1ChoiceTypeDef,
	value: { kind: string; value: unknown },
): Uint8Array {
	for (const alt of def.alternatives) {
		if (
			"kind" in alt &&
			(alt.kind === "extensionMarker" || alt.kind === "extensionAdditionGroup")
		)
			continue;
		if (alt.name === value.kind) return derEncodeDef(alt.type, value.value);
	}
	throw new EncodingError(`Unknown CHOICE alternative: "${value.kind}"`);
}

/** Extract the Tag of the first byte(s) of a TLV — used for SET sorting. */
function getFirstTag(tlv: Uint8Array): EncodedTag {
	const byte = tlv[0]!;
	const classNum = byte & 0xc0;
	const tagClass =
		classNum === 0
			? ("universal" as const)
			: classNum === 0x40
				? ("application" as const)
				: classNum === 0x80
					? ("context" as const)
					: ("private" as const);
	const constructed = (byte & 0x20) !== 0;
	const tagNum = byte & 0x1f;
	// For long-form tags (0x1F) we approximate by using 31 — sufficient for sort ordering
	return { tagClass, tagNumber: tagNum < 31 ? tagNum : 31, constructed };
}
