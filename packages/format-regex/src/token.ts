import type { Span } from "@ac-kit/core";

export enum TokenKind {
	Char,
	Shorthand,
	Dot,
	Caret,
	Dollar,
	Star,
	Plus,
	Question,
	Pipe,
	LParen,
	NonCapturingLParen,
	RParen,
	LBracket,
	RBracket,
	Hyphen,
	LBrace,
	RBrace,
	Comma,
	Number,
	EndOfPattern,
}

export interface Token {
	readonly kind: TokenKind;
	readonly text: string;
	readonly span: Span;
}
