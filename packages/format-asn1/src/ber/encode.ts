import {
	ByteBuilder,
	bigIntToBytesBe,
	encodeTextLatin1,
	encodeTextUtf16Be,
	encodeTextUtf32Be,
	encodeTextUtf8,
} from "@ac-kit/core";

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
	AnyValue,
	BitStringValue,
	GeneralizedTimeValue,
	RealValue,
	UtcTimeValue,
} from "../schema/values.js";
import { taggedDefTag, universalTagFor } from "./tags.js";

export interface BerEncodeOptions {
	/**
	 * Use indefinite-length encoding for constructed types (BER-only; DER/CER
	 * have their own rules).
	 */
	readonly indefiniteLength?: boolean;
}

/** BER encoder — produces a complete TLV for the given def + value. */
export function berEncode<D extends AnyAsn1TypeDef>(
	def: D,
	value: DefInputOf<D>,
	opts: BerEncodeOptions = {},
): Uint8Array {
	return berEncodeDef(def, value, opts);
}

function berEncodeDef(
	def: AnyAsn1TypeDef,
	value: unknown,
	opts: BerEncodeOptions,
): Uint8Array {
	// Resolve lazy and transform defs first
	if (def.kind === "lazy") {
		const inner = def.getter();
		return berEncodeDef(inner, value, opts);
	}
	if (def.kind === "transform") {
		return berEncodeDef(def.innerType, value, opts);
	}
	if (def.kind === "parameterizedTypeInstance") {
		// parameterizedTypeInstance: resolve before encoding
		return berEncodeDef(resolveInstance(def), value, opts);
	}

	// Tagged types
	if (def.kind === "tagged") {
		return encodeTagged(def, value, opts);
	}

	// Encode contents, then wrap with UNIVERSAL tag
	const contents = encodeContents(def, value, opts);
	const tagInfo = universalTagFor(def);
	if (!tagInfo) {
		// CHOICE: already fully encoded (CHOICE has no wrapper)
		return contents;
	}
	const tag = {
		tagClass: "universal" as const,
		tagNumber: tagInfo.tagNumber,
		constructed: tagInfo.constructed,
	};
	if (opts.indefiniteLength && tagInfo.constructed) {
		return writeTlvIndefinite(tag, contents);
	}
	return writeTlv(tag, contents);
}

function encodeTagged(
	def: Asn1TaggedTypeDef,
	value: unknown,
	opts: BerEncodeOptions,
): Uint8Array {
	const inner = def.innerType;
	const innerTagInfo = universalTagFor(inner);
	const innerConstructed = innerTagInfo?.constructed ?? false;

	const tag = taggedDefTag(def, innerConstructed);

	if (def.mode === "explicit") {
		const innerEncoded = berEncodeDef(inner, value, opts);
		if (opts.indefiniteLength && tag.constructed) {
			return writeTlvIndefinite(tag, innerEncoded);
		}
		return writeTlv(tag, innerEncoded);
	}

	// Implicit: encode inner contents (no tag/length wrapper from inner), use outer tag
	const contents = encodeContents(inner, value, opts);
	if (opts.indefiniteLength && tag.constructed) {
		return writeTlvIndefinite(tag, contents);
	}
	return writeTlv(tag, contents);
}

/** Encode the VALUE portion (contents) without the TLV wrapper. */
function encodeContents(
	def: AnyAsn1TypeDef,
	value: unknown,
	opts: BerEncodeOptions = {},
): Uint8Array {
	switch (def.kind) {
		case "boolean":
			return new Uint8Array([value ? 0xff : 0x00]);

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
			// AnyValue should carry the raw encoding
			if (anyVal && typeof anyVal === "object" && "encoded" in anyVal) {
				return (anyVal as { encoded: Uint8Array }).encoded;
			}
			return new Uint8Array(0);
		}

		case "utf8String":

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
		case "set":
			return encodeSequenceContents(
				def,
				value as Record<string, unknown>,
				opts,
			);

		case "sequenceOf":
			return encodeOf(def.elementType, value as unknown[], opts);

		case "setOf":
			return encodeOf(def.elementType, value as unknown[], opts);

		case "choice":
			return encodeChoice(def, value as { kind: string; value: unknown }, opts);

		case "external":
		case "embeddedPdv":
		case "characterString":
			// Encoded as SEQUENCE — pass through any pre-encoded value
			if (value instanceof Uint8Array) return value;
			return new Uint8Array(0);

		case "lazy": {
			const inner = def.getter();
			return encodeContents(inner, value, opts);
		}

		case "transform":
			return encodeContents(def.innerType, value, opts);

		default:
			throw new EncodingError(`Cannot BER-encode def kind: ${def.kind}`);
	}
}

function encodeSequenceContents(
	def: Asn1SequenceTypeDef | Asn1SetTypeDef,
	value: Record<string, unknown>,
	opts: BerEncodeOptions,
): Uint8Array {
	const w = new ByteBuilder();
	for (const comp of def.components) {
		if (comp.kind === "extensionMarker") continue;
		if (comp.kind === "extensionAdditionGroup") {
			for (const inner of comp.components) {
				encodeComponentTo(w, inner, value, opts);
			}
			continue;
		}
		if (comp.kind === "componentsOf") continue; // must be expanded before encoding
		encodeComponentTo(w, comp, value, opts);
	}
	return w.toBytes();
}

function encodeComponentTo(
	w: ByteBuilder,
	comp: Asn1ComponentDef,
	value: Record<string, unknown>,
	opts: BerEncodeOptions,
): void {
	const v = value[comp.name];
	if (v === undefined) {
		if (comp.optional) return;
		if (comp.defaultValue !== undefined) return;
		throw new EncodingError(`Required component "${comp.name}" is missing`);
	}
	w.write(berEncodeDef(comp.type, v, opts));
}

function encodeOf(
	elementDef: AnyAsn1TypeDef,
	values: unknown[],
	opts: BerEncodeOptions,
): Uint8Array {
	const w = new ByteBuilder();
	for (const v of values) w.write(berEncodeDef(elementDef, v, opts));
	return w.toBytes();
}

function encodeChoice(
	def: Asn1ChoiceTypeDef,
	value: { kind: string; value: unknown },
	opts: BerEncodeOptions,
): Uint8Array {
	for (const alt of def.alternatives) {
		if (
			"kind" in alt &&
			(alt.kind === "extensionMarker" || alt.kind === "extensionAdditionGroup")
		)
			continue;
		const altDef = alt as Asn1AlternativeDef;
		if (altDef.name === value.kind) {
			// CHOICE has no wrapper TLV — the chosen alternative IS the TLV
			return berEncodeDef(altDef.type, value.value, opts);
		}
	}
	throw new EncodingError(`Unknown CHOICE alternative: "${value.kind}"`);
}
