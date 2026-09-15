// X.690 §8.1.2.2 — Identifier octets: tag class bits (7-6)
export const TAG_CLASS_UNIVERSAL = 0x00;
export const TAG_CLASS_APPLICATION = 0x40;
export const TAG_CLASS_CONTEXT = 0x80;
export const TAG_CLASS_PRIVATE = 0xc0;

// Bit 5: constructed/primitive
export const TAG_CONSTRUCTED = 0x20;
export const TAG_PRIMITIVE = 0x00;

// X.690 §8.1.2.2 — First octet long-form indicator
export const TAG_LONG_FORM = 0x1f;

// ── UNIVERSAL tag numbers (X.680 §8.6, X.690 §8.1.2.2) ──────────────────────

export const UNIVERSAL_TAG_BOOLEAN = 1;
export const UNIVERSAL_TAG_INTEGER = 2;
export const UNIVERSAL_TAG_BIT_STRING = 3;
export const UNIVERSAL_TAG_OCTET_STRING = 4;
export const UNIVERSAL_TAG_NULL = 5;
export const UNIVERSAL_TAG_OBJECT_IDENTIFIER = 6;
export const UNIVERSAL_TAG_OBJECT_DESCRIPTOR = 7; // = GeneralString in practice
export const UNIVERSAL_TAG_EXTERNAL = 8; // EXTERNAL, INSTANCE OF (SEQUENCE)
export const UNIVERSAL_TAG_REAL = 9;
export const UNIVERSAL_TAG_ENUMERATED = 10;
export const UNIVERSAL_TAG_EMBEDDED_PDV = 11; // EMBEDDED PDV (SEQUENCE)
export const UNIVERSAL_TAG_UTF8_STRING = 12;
export const UNIVERSAL_TAG_RELATIVE_OID = 13;
export const UNIVERSAL_TAG_TIME = 14;
// 15 reserved
export const UNIVERSAL_TAG_SEQUENCE = 16; // SEQUENCE and SEQUENCE OF
export const UNIVERSAL_TAG_SET = 17; // SET and SET OF
export const UNIVERSAL_TAG_NUMERIC_STRING = 18;
export const UNIVERSAL_TAG_PRINTABLE_STRING = 19;
export const UNIVERSAL_TAG_TELETEX_STRING = 20; // T61String
export const UNIVERSAL_TAG_VIDEOTEX_STRING = 21;
export const UNIVERSAL_TAG_IA5_STRING = 22;
export const UNIVERSAL_TAG_UTC_TIME = 23;
export const UNIVERSAL_TAG_GENERALIZED_TIME = 24;
export const UNIVERSAL_TAG_GRAPHIC_STRING = 25;
export const UNIVERSAL_TAG_VISIBLE_STRING = 26; // ISO646String
export const UNIVERSAL_TAG_GENERAL_STRING = 27;
export const UNIVERSAL_TAG_UNIVERSAL_STRING = 28;
export const UNIVERSAL_TAG_CHARACTER_STRING = 29; // CHARACTER STRING (SEQUENCE)
export const UNIVERSAL_TAG_BMP_STRING = 30;

// X.680 6th edition (2021) time types — tag numbers ≥ 31 require long-form encoding
export const UNIVERSAL_TAG_DATE = 31;
export const UNIVERSAL_TAG_TIME_OF_DAY = 32;
export const UNIVERSAL_TAG_DATE_TIME = 33;
export const UNIVERSAL_TAG_DURATION = 34;
export const UNIVERSAL_TAG_OID_IRI = 35;
export const UNIVERSAL_TAG_RELATIVE_OID_IRI = 36;
