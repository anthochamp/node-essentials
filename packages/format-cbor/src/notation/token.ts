import type { Span } from "@ac-kit/core";

export enum TokenKind {
	Number,
	Text,
	ByteStringHex,
	ByteStringBase64,
	Identifier,
	LeftBracket,
	RightBracket,
	LeftBrace,
	RightBrace,
	LeftParen,
	RightParen,
	Comma,
	Colon,
	EndOfInput,
}

export interface Token {
	readonly kind: TokenKind;
	readonly text: string;
	readonly span: Span;
	/**
	 * Comments (`/ ... /`, EDN — RFC 8610 Appendix G.6) immediately preceding
	 * this token.
	 */
	readonly leadingComments: readonly string[];
}
