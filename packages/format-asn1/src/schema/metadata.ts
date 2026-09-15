/**
 * Tag class values as defined by X.690 §8.1.2.2.
 *
 * - `"universal"` — ITU-T / ISO built-in types (class bits `00`)
 * - `"application"` — application-specific (class bits `01`)
 * - `"context"` — context-specific, most common for IMPLICIT / EXPLICIT tagging
 *   (class bits `10`)
 * - `"private"` — enterprise / private use (class bits `11`)
 */
export type TagClass = "universal" | "application" | "context" | "private";

/**
 * ASN.1 tagging mode per X.680 §24.
 *
 * - `"explicit"` — the tag wraps the original encoding; the underlying type tag
 *   is preserved
 * - `"implicit"` — the tag replaces the original encoding tag; the underlying
 *   type tag is lost
 */
export type TaggingMode = "explicit" | "implicit";

/**
 * An ASN.1 tag: a (class, number) pair that uniquely identifies a type encoding
 * in a given context.
 */
export interface Tag {
	/** Tag class (universal, application, context, or private). */
	readonly tagClass: TagClass;

	/** Tag number (non-negative integer). */
	readonly tagNumber: number;
}

// ── Universal tag numbers (X.680 §8.6, X.690 §8.1) ───────────────────────────

/** Universal tag numbers for ASN.1 built-in types as assigned by X.680 §8.6. */
export enum UniversalTagNumber {
	BOOLEAN = 1,
	INTEGER = 2,
	BIT_STRING = 3,
	OCTET_STRING = 4,
	NULL = 5,
	OBJECT_IDENTIFIER = 6,
	OBJECT_DESCRIPTOR = 7,
	EXTERNAL = 8,
	REAL = 9,
	ENUMERATED = 10,
	EMBEDDED_PDV = 11,
	UTF8_STRING = 12,
	RELATIVE_OID = 13,
	TIME = 14,
	SEQUENCE = 16,
	SET = 17,
	NUMERIC_STRING = 18,
	PRINTABLE_STRING = 19,
	TELETEX_STRING = 20,
	VIDEOTEX_STRING = 21,
	IA5_STRING = 22,
	UTC_TIME = 23,
	GENERALIZED_TIME = 24,
	GRAPHIC_STRING = 25,
	VISIBLE_STRING = 26,
	GENERAL_STRING = 27,
	UNIVERSAL_STRING = 28,
	CHARACTER_STRING = 29,
	BMP_STRING = 30,
	DATE = 31,
	TIME_OF_DAY = 32,
	DATE_TIME = 33,
	DURATION = 34,
	OID_IRI = 35,
	RELATIVE_OID_IRI = 36,
}
