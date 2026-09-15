import { isAsciiAlpha, isAsciiDigit, type Span } from "@ac-kit/core";

import { Token, TokenKind } from "./token.js";

export class CronLexerError extends Error {
	readonly span: Span;
	constructor(message: string, span: Span) {
		super(message);
		this.name = "CronLexerError";
		this.span = span;
	}
}

/**
 * Tokenizes a single cron field (one of the five whitespace-separated segments
 * of a cron expression — fields never contain whitespace themselves).
 */
export function lexCronField(field: string): Token[] {
	const tokens: Token[] = [];
	let pos = 0;

	while (pos < field.length) {
		const cc = field.charCodeAt(pos);
		const start = pos;

		if (isAsciiDigit(cc)) {
			while (pos < field.length && isAsciiDigit(field.charCodeAt(pos))) pos++;
			tokens.push({
				kind: TokenKind.Number,
				text: field.slice(start, pos),
				span: { start, end: pos },
			});
			continue;
		}

		if (isAsciiAlpha(cc)) {
			while (pos < field.length && isAsciiAlpha(field.charCodeAt(pos))) pos++;
			tokens.push({
				kind: TokenKind.Name,
				text: field.slice(start, pos),
				span: { start, end: pos },
			});
			continue;
		}

		const char = field[pos]!;
		const single = (kind: TokenKind): Token => ({
			kind,
			text: char,
			span: { start, end: start + 1 },
		});
		switch (char) {
			case "*":
				tokens.push(single(TokenKind.Asterisk));
				break;
			case "-":
				tokens.push(single(TokenKind.Hyphen));
				break;
			case "/":
				tokens.push(single(TokenKind.Slash));
				break;
			case ",":
				tokens.push(single(TokenKind.Comma));
				break;
			default:
				throw new CronLexerError(`Unexpected character '${char}'`, {
					start,
					end: start + 1,
				});
		}
		pos++;
	}

	tokens.push({
		kind: TokenKind.EndOfField,
		text: "",
		span: { start: pos, end: pos },
	});
	return tokens;
}
