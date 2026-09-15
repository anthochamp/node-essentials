import {
	UNIVERSAL_TAG_BIT_STRING,
	UNIVERSAL_TAG_BMP_STRING,
	UNIVERSAL_TAG_BOOLEAN,
	UNIVERSAL_TAG_CHARACTER_STRING,
	UNIVERSAL_TAG_DATE,
	UNIVERSAL_TAG_DATE_TIME,
	UNIVERSAL_TAG_DURATION,
	UNIVERSAL_TAG_EMBEDDED_PDV,
	UNIVERSAL_TAG_ENUMERATED,
	UNIVERSAL_TAG_EXTERNAL,
	UNIVERSAL_TAG_GENERAL_STRING,
	UNIVERSAL_TAG_GENERALIZED_TIME,
	UNIVERSAL_TAG_GRAPHIC_STRING,
	UNIVERSAL_TAG_IA5_STRING,
	UNIVERSAL_TAG_INTEGER,
	UNIVERSAL_TAG_NULL,
	UNIVERSAL_TAG_NUMERIC_STRING,
	UNIVERSAL_TAG_OBJECT_IDENTIFIER,
	UNIVERSAL_TAG_OCTET_STRING,
	UNIVERSAL_TAG_OID_IRI,
	UNIVERSAL_TAG_PRINTABLE_STRING,
	UNIVERSAL_TAG_REAL,
	UNIVERSAL_TAG_RELATIVE_OID,
	UNIVERSAL_TAG_RELATIVE_OID_IRI,
	UNIVERSAL_TAG_SEQUENCE,
	UNIVERSAL_TAG_SET,
	UNIVERSAL_TAG_TELETEX_STRING,
	UNIVERSAL_TAG_TIME,
	UNIVERSAL_TAG_TIME_OF_DAY,
	UNIVERSAL_TAG_UNIVERSAL_STRING,
	UNIVERSAL_TAG_UTC_TIME,
	UNIVERSAL_TAG_UTF8_STRING,
	UNIVERSAL_TAG_VIDEOTEX_STRING,
	UNIVERSAL_TAG_VISIBLE_STRING,
} from "../_encoding/constants.js";
import type { EncodedTag } from "../_encoding/tag.js";
import { AnyAsn1TypeDef } from "../schema/types/any-def.js";
import type { Asn1TaggedTypeDef } from "../schema/types/base.js";

export type DefTagInfo = {
	tagNumber: number;
	constructed: boolean;
};

/**
 * Return the UNIVERSAL tag number and constructed flag for a def kind. Returns
 * undefined for CHOICE (no single tag).
 */
export function universalTagFor(def: AnyAsn1TypeDef): DefTagInfo | undefined {
	switch (def.kind) {
		case "boolean":
			return { tagNumber: UNIVERSAL_TAG_BOOLEAN, constructed: false };
		case "integer":
			return { tagNumber: UNIVERSAL_TAG_INTEGER, constructed: false };
		case "bitString":
			return { tagNumber: UNIVERSAL_TAG_BIT_STRING, constructed: false };
		case "octetString":
			return { tagNumber: UNIVERSAL_TAG_OCTET_STRING, constructed: false };
		case "null":
			return { tagNumber: UNIVERSAL_TAG_NULL, constructed: false };
		case "objectIdentifier":
			return { tagNumber: UNIVERSAL_TAG_OBJECT_IDENTIFIER, constructed: false };
		case "relativeOid":
			return { tagNumber: UNIVERSAL_TAG_RELATIVE_OID, constructed: false };
		case "oidIri":
			return { tagNumber: UNIVERSAL_TAG_OID_IRI, constructed: false };
		case "relativeOidIri":
			return { tagNumber: UNIVERSAL_TAG_RELATIVE_OID_IRI, constructed: false };
		case "real":
			return { tagNumber: UNIVERSAL_TAG_REAL, constructed: false };
		case "enumerated":
			return { tagNumber: UNIVERSAL_TAG_ENUMERATED, constructed: false };
		case "any":
			return undefined; // ANY matches any tag
		case "utf8String":
			return { tagNumber: UNIVERSAL_TAG_UTF8_STRING, constructed: false };
		case "numericString":
			return { tagNumber: UNIVERSAL_TAG_NUMERIC_STRING, constructed: false };
		case "printableString":
			return { tagNumber: UNIVERSAL_TAG_PRINTABLE_STRING, constructed: false };
		case "teletexString":
			return { tagNumber: UNIVERSAL_TAG_TELETEX_STRING, constructed: false };
		case "videotexString":
			return { tagNumber: UNIVERSAL_TAG_VIDEOTEX_STRING, constructed: false };
		case "ia5String":
			return { tagNumber: UNIVERSAL_TAG_IA5_STRING, constructed: false };
		case "graphicString":
			return { tagNumber: UNIVERSAL_TAG_GRAPHIC_STRING, constructed: false };
		case "visibleString":
			return { tagNumber: UNIVERSAL_TAG_VISIBLE_STRING, constructed: false };
		case "generalString":
			return { tagNumber: UNIVERSAL_TAG_GENERAL_STRING, constructed: false };
		case "universalString":
			return { tagNumber: UNIVERSAL_TAG_UNIVERSAL_STRING, constructed: false };
		case "bmpString":
			return { tagNumber: UNIVERSAL_TAG_BMP_STRING, constructed: false };
		case "utcTime":
			return { tagNumber: UNIVERSAL_TAG_UTC_TIME, constructed: false };
		case "generalizedTime":
			return { tagNumber: UNIVERSAL_TAG_GENERALIZED_TIME, constructed: false };
		case "time":
			return { tagNumber: UNIVERSAL_TAG_TIME, constructed: false };
		case "date":
			return { tagNumber: UNIVERSAL_TAG_DATE, constructed: false };
		case "timeOfDay":
			return { tagNumber: UNIVERSAL_TAG_TIME_OF_DAY, constructed: false };
		case "dateTime":
			return { tagNumber: UNIVERSAL_TAG_DATE_TIME, constructed: false };
		case "duration":
			return { tagNumber: UNIVERSAL_TAG_DURATION, constructed: false };
		case "sequence":
		case "sequenceOf":
			return { tagNumber: UNIVERSAL_TAG_SEQUENCE, constructed: true };
		case "set":
		case "setOf":
			return { tagNumber: UNIVERSAL_TAG_SET, constructed: true };
		case "choice":
			return undefined;
		case "external":
			return { tagNumber: UNIVERSAL_TAG_EXTERNAL, constructed: true };
		case "embeddedPdv":
			return { tagNumber: UNIVERSAL_TAG_EMBEDDED_PDV, constructed: true };
		case "characterString":
			return { tagNumber: UNIVERSAL_TAG_CHARACTER_STRING, constructed: true };
		case "tagged":
		case "transform":
		case "lazy":
		case "paramRef":
		case "paramValueRef":
		case "parameterizedTypeInstance":
		case "informationObject":
		case "informationObjectSet":
		case "openType":
			return undefined;
		default:
			return undefined;
	}
}

/** Build a Tag struct for a def's UNIVERSAL tag. */
export function universalTag(def: AnyAsn1TypeDef): EncodedTag | undefined {
	const info = universalTagFor(def);
	if (!info) return undefined;
	return {
		tagClass: "universal",
		tagNumber: info.tagNumber,
		constructed: info.constructed,
	};
}

/** Build a Tag struct for a schema-level Asn1TaggedTypeDef. */
export function taggedDefTag(
	def: Asn1TaggedTypeDef,
	innerConstructed: boolean,
): EncodedTag {
	// For implicit tagging, the constructed bit is inherited from the inner type
	const constructed = def.mode === "explicit" ? true : innerConstructed;
	return {
		tagClass: def.tag.tagClass,
		tagNumber: def.tag.tagNumber,
		constructed,
	};
}
