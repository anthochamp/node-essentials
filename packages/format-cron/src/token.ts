import type { Span } from "@ac-kit/core";

export enum TokenKind {
	Number,
	Name,
	Asterisk,
	Hyphen,
	Slash,
	Comma,
	EndOfField,
}

export interface Token {
	readonly kind: TokenKind;
	readonly text: string;
	readonly span: Span;
}
