import type { Span } from "./span.js";
import type { Trivia } from "./trivia.js";

// ── Token kinds ───────────────────────────────────────────────────────────────

export enum TokenKind {
	// Identifiers
	Identifier = 1, // lowercase-initial
	TypeReference, // uppercase-initial

	// Literals
	Number,
	RealNumber,
	BinaryString,
	HexString,
	CharString,

	// Punctuation
	Assign, // ::=
	DotDot, // ..
	Ellipsis, // ...
	LeftBrace, // {
	RightBrace, // }
	LeftParen, // (
	RightParen, // )
	LeftBracket, // [
	RightBracket, // ]
	DoubleBracketLeft, // [[
	DoubleBracketRight, // ]]
	Comma, // ,
	Semicolon, // ;
	Colon, // :
	At, // @
	Pipe, // |
	Caret, // ^
	Exclamation, // !
	Dot, // .
	Minus, // -
	LessThan, // <
	GreaterThan, // >

	// Keywords (X.680 §12.2)
	KwAbsent,
	KwAbstractSyntax,
	KwAll,
	KwApplication,
	KwAutomatic,
	KwBegin,
	KwBy,
	KwClass,
	KwComponent,
	KwComponents,
	KwContaining,
	KwDefault,
	KwDefinitions,
	KwEncoded,
	KwEnd,
	KwEnumerated,
	KwExcept,
	KwExplicit,
	KwExplicitTags, // not a real keyword — handled as two tokens
	KwExports,
	KwExtensibilityImplied,
	KwFalse,
	KwFrom,
	KwImplicit,
	KwImplied,
	KwImports,
	KwIncludes,
	KwInstance,
	KwIntersection,
	KwMax,
	KwMin,
	KwMinusInfinity,
	KwNotANumber,
	KwNull,
	KwObject,
	KwObjectIdentifier, // special: multi-word in ASN.1 but single concept
	KwOf,
	KwOptional,
	KwPattern,
	KwPlusInfinity,
	KwPresent,
	KwPrivate,
	KwReal,
	KwRelativeOid,
	KwSequence,
	KwSet,
	KwSettings,
	KwSize,
	KwString,
	KwSyntax,
	KwTags,
	KwTrue,
	KwTypeIdentifier,
	KwUnion,
	KwUnique,
	KwUniversal,
	KwWith,
	// Time types
	KwDate,
	KwDateTime,
	KwDuration,
	KwTime,
	KwTimeOfDay,
	// String types (TYPE REFERENCES in ASN.1, but effectively reserved)
	KwBmpString,
	KwGeneralString,
	KwGeneralizedTime,
	KwGraphicString,
	KwIa5String,
	KwIso646String,
	KwNumericString,
	KwObjectDescriptor,
	KwOctetString,
	KwPrintableString,
	KwRelativeOidIri,
	KwT61String,
	KwTeletexString,
	KwUniversalString,
	KwUtcTime,
	KwUtf8String,
	KwVideotexString,
	KwVisibleString,
	// Primitive type keywords
	KwBitString,
	KwBoolean,
	KwCharacterString,
	KwChoice,
	KwEmbeddedPdv,
	KwExternal,
	KwInteger,
	KwOidIri,

	EndOfFile,
}

export interface Token {
	readonly kind: TokenKind;
	readonly span: Span;
	readonly leadingTrivia: readonly Trivia[];
	readonly text: string;
}

/** Maps keyword strings to their TokenKind. Built once at module load. */
export const KEYWORD_TABLE: ReadonlyMap<string, TokenKind> = new Map<
	string,
	TokenKind
>([
	["ABSENT", TokenKind.KwAbsent],
	["ABSTRACT-SYNTAX", TokenKind.KwAbstractSyntax],
	["ALL", TokenKind.KwAll],
	["APPLICATION", TokenKind.KwApplication],
	["AUTOMATIC", TokenKind.KwAutomatic],
	["BEGIN", TokenKind.KwBegin],
	["BIT", TokenKind.KwBitString], // BIT STRING — "BIT" starts it
	["BMPString", TokenKind.KwBmpString],
	["BOOLEAN", TokenKind.KwBoolean],
	["CHOICE", TokenKind.KwChoice],
	["BY", TokenKind.KwBy],
	["CHARACTER", TokenKind.KwCharacterString],
	["CLASS", TokenKind.KwClass],
	["COMPONENT", TokenKind.KwComponent],
	["COMPONENTS", TokenKind.KwComponents],
	["CONTAINING", TokenKind.KwContaining],
	["DATE", TokenKind.KwDate],
	["DATE-TIME", TokenKind.KwDateTime],
	["DEFAULT", TokenKind.KwDefault],
	["DEFINITIONS", TokenKind.KwDefinitions],
	["DURATION", TokenKind.KwDuration],
	["EMBEDDED", TokenKind.KwEmbeddedPdv],
	["ENCODED", TokenKind.KwEncoded],
	["END", TokenKind.KwEnd],
	["ENUMERATED", TokenKind.KwEnumerated],
	["EXCEPT", TokenKind.KwExcept],
	["EXPLICIT", TokenKind.KwExplicit],
	["EXPORTS", TokenKind.KwExports],
	["EXTENSIBILITY", TokenKind.KwExtensibilityImplied],
	["EXTERNAL", TokenKind.KwExternal],
	["FALSE", TokenKind.KwFalse],
	["FROM", TokenKind.KwFrom],
	["GeneralString", TokenKind.KwGeneralString],
	["GeneralizedTime", TokenKind.KwGeneralizedTime],
	["GraphicString", TokenKind.KwGraphicString],
	["IA5String", TokenKind.KwIa5String],
	["IMPLICIT", TokenKind.KwImplicit],
	["IMPLIED", TokenKind.KwImplied],
	["IMPORTS", TokenKind.KwImports],
	["INCLUDES", TokenKind.KwIncludes],
	["INSTANCE", TokenKind.KwInstance],
	["INTEGER", TokenKind.KwInteger],
	["INTERSECTION", TokenKind.KwIntersection],
	["ISO646String", TokenKind.KwIso646String],
	["MAX", TokenKind.KwMax],
	["MIN", TokenKind.KwMin],
	["MINUS-INFINITY", TokenKind.KwMinusInfinity],
	["NOT-A-NUMBER", TokenKind.KwNotANumber],
	["NULL", TokenKind.KwNull],
	["NumericString", TokenKind.KwNumericString],
	["OBJECT", TokenKind.KwObject],
	["OCTET", TokenKind.KwOctetString], // OCTET STRING — "OCTET" starts it
	["OF", TokenKind.KwOf],
	["OID-IRI", TokenKind.KwOidIri],
	["OPTIONAL", TokenKind.KwOptional],
	["PATTERN", TokenKind.KwPattern],
	["PDV", TokenKind.KwEmbeddedPdv],
	["PLUS-INFINITY", TokenKind.KwPlusInfinity],
	["PRESENT", TokenKind.KwPresent],
	["PRIVATE", TokenKind.KwPrivate],
	["PrintableString", TokenKind.KwPrintableString],
	["REAL", TokenKind.KwReal],
	["RELATIVE-OID", TokenKind.KwRelativeOid],
	["RELATIVE-OID-IRI", TokenKind.KwRelativeOidIri],
	["SEQUENCE", TokenKind.KwSequence],
	["SET", TokenKind.KwSet],
	["SETTINGS", TokenKind.KwSettings],
	["SIZE", TokenKind.KwSize],
	["STRING", TokenKind.KwString],
	["SYNTAX", TokenKind.KwSyntax],
	["T61String", TokenKind.KwT61String],
	["TAGS", TokenKind.KwTags],
	["TIME", TokenKind.KwTime],
	["TIME-OF-DAY", TokenKind.KwTimeOfDay],
	["TRUE", TokenKind.KwTrue],
	["TYPE-IDENTIFIER", TokenKind.KwTypeIdentifier],
	["TeletexString", TokenKind.KwTeletexString],
	["UTCTime", TokenKind.KwUtcTime],
	["UNION", TokenKind.KwUnion],
	["UNIQUE", TokenKind.KwUnique],
	["UNIVERSAL", TokenKind.KwUniversal],
	["UTF8String", TokenKind.KwUtf8String],
	["UniversalString", TokenKind.KwUniversalString],
	["VideotexString", TokenKind.KwVideotexString],
	["VisibleString", TokenKind.KwVisibleString],
	["WITH", TokenKind.KwWith],
	["ObjectDescriptor", TokenKind.KwObjectDescriptor],
]);
