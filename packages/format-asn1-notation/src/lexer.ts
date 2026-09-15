import {
	ASTERISK,
	AT_SIGN,
	CARET,
	COLON,
	COMMA,
	CR,
	DOUBLE_QUOTE,
	EQUALS,
	EXCLAMATION_MARK,
	GREATER_THAN,
	HYPHEN_MINUS,
	isAsciiAlpha,
	isAsciiAlphaNumeric,
	isAsciiDigit,
	isAsciiLowerAlpha,
	isAsciiUpperAlpha,
	isAsciiWhitespace,
	LEFT_CURLY_BRACKET,
	LEFT_PARENTHESIS,
	LEFT_SQUARE_BRACKET,
	LESS_THAN,
	LF,
	PERIOD,
	RIGHT_CURLY_BRACKET,
	RIGHT_PARENTHESIS,
	RIGHT_SQUARE_BRACKET,
	SEMICOLON,
	SINGLE_QUOTE,
	SLASH,
	VERTICAL_BAR,
} from "@ac-kit/core";

import { Span } from "./span.js";
import { KEYWORD_TABLE, Token, TokenKind } from "./token.js";
import { Trivia } from "./trivia.js";

export class LexerError extends Error {
	readonly span: Span;
	constructor(message: string, span: Span) {
		super(message);
		this.name = "LexerError";
		this.span = span;
	}
}

export class Lexer {
	private readonly src: string;
	private pos: number = 0;
	private _peeked: Token | undefined = undefined;

	constructor(source: string) {
		this.src = source;
	}

	peek(): Token {
		if (!this._peeked) this._peeked = this._read();
		return this._peeked;
	}

	peekKind(): TokenKind {
		return this.peek().kind;
	}

	next(): Token {
		if (this._peeked) {
			const t = this._peeked;
			this._peeked = undefined;
			return t;
		}
		return this._read();
	}

	private _read(): Token {
		const trivia = this._readTrivia();
		const start = this.pos;

		if (this.pos >= this.src.length) {
			return {
				kind: TokenKind.EndOfFile,
				span: { start, end: start },
				leadingTrivia: trivia,
				text: "",
			};
		}

		const cc = this.src.charCodeAt(this.pos);

		// Uppercase letter → type reference or keyword
		if (isAsciiUpperAlpha(cc)) return this._readUpperIdentifier(start, trivia);

		// Lowercase letter → identifier or keyword (mixed-case keywords like UTF8String)
		if (isAsciiLowerAlpha(cc)) return this._readLowerIdentifier(start, trivia);

		// Digit → number
		if (isAsciiDigit(cc)) return this._readNumber(start, trivia);

		// String literals
		if (cc === DOUBLE_QUOTE) return this._readCharString(start, trivia);
		if (cc === SINGLE_QUOTE) return this._readQuotedString(start, trivia);

		// Punctuation
		return this._readPunct(start, trivia, cc);
	}

	private _readUpperIdentifier(
		start: number,
		trivia: readonly Trivia[],
	): Token {
		// Scan the full token: uppercase, lowercase, digits, hyphens
		// Note: keywords like MINUS-INFINITY, NOT-A-NUMBER, OBJECT IDENTIFIER etc.
		// are handled after scanning the first word
		let end = this.pos + 1;
		while (end < this.src.length) {
			const c = this.src.charCodeAt(end);
			if (isAsciiAlphaNumeric(c)) {
				end++;
			} else if (c === HYPHEN_MINUS) {
				// Hyphen in keyword like MINUS-INFINITY — peek ahead to see if it continues
				const next =
					end + 1 < this.src.length ? this.src.charCodeAt(end + 1) : 0;
				if (isAsciiAlpha(next)) {
					end++;
				} else {
					break;
				}
			} else {
				break;
			}
		}
		const text = this.src.slice(this.pos, end);
		this.pos = end;
		const kwKind = KEYWORD_TABLE.get(text);
		if (kwKind !== undefined) {
			return {
				kind: kwKind,
				span: { start, end: this.pos },
				leadingTrivia: trivia,
				text,
			};
		}
		return {
			kind: TokenKind.TypeReference,
			span: { start, end: this.pos },
			leadingTrivia: trivia,
			text,
		};
	}

	private _readLowerIdentifier(
		start: number,
		trivia: readonly Trivia[],
	): Token {
		let end = this.pos + 1;
		while (end < this.src.length) {
			const c = this.src.charCodeAt(end);
			if (isAsciiAlphaNumeric(c) || c === HYPHEN_MINUS) {
				end++;
			} else {
				break;
			}
		}
		const text = this.src.slice(this.pos, end);
		this.pos = end;
		// Check keyword table for mixed-case keys like "UTF8String"
		const kwKind = KEYWORD_TABLE.get(text);
		if (kwKind !== undefined) {
			return {
				kind: kwKind,
				span: { start, end: this.pos },
				leadingTrivia: trivia,
				text,
			};
		}
		return {
			kind: TokenKind.Identifier,
			span: { start, end: this.pos },
			leadingTrivia: trivia,
			text,
		};
	}

	private _readNumber(start: number, trivia: readonly Trivia[]): Token {
		let end = this.pos;
		while (end < this.src.length && isAsciiDigit(this.src.charCodeAt(end)))
			end++;

		// Check for real number (digits . digits)
		if (end < this.src.length && this.src.charCodeAt(end) === PERIOD) {
			const nextAfterDot = end + 1;
			if (
				nextAfterDot < this.src.length &&
				isAsciiDigit(this.src.charCodeAt(nextAfterDot))
			) {
				end = nextAfterDot + 1;
				while (end < this.src.length && isAsciiDigit(this.src.charCodeAt(end)))
					end++;
				const text = this.src.slice(this.pos, end);
				this.pos = end;
				return {
					kind: TokenKind.RealNumber,
					span: { start, end: this.pos },
					leadingTrivia: trivia,
					text,
				};
			}
		}

		const text = this.src.slice(this.pos, end);
		this.pos = end;
		return {
			kind: TokenKind.Number,
			span: { start, end: this.pos },
			leadingTrivia: trivia,
			text,
		};
	}

	private _readCharString(start: number, trivia: readonly Trivia[]): Token {
		let end = this.pos + 1;
		while (end < this.src.length && this.src.charCodeAt(end) !== DOUBLE_QUOTE)
			end++;
		if (end >= this.src.length)
			throw new LexerError("Unterminated string literal", { start, end });
		end++; // consume closing "
		const text = this.src.slice(this.pos, end);
		this.pos = end;
		return {
			kind: TokenKind.CharString,
			span: { start, end: this.pos },
			leadingTrivia: trivia,
			text,
		};
	}

	private _readQuotedString(start: number, trivia: readonly Trivia[]): Token {
		let end = this.pos + 1;
		while (end < this.src.length && this.src.charCodeAt(end) !== SINGLE_QUOTE)
			end++;
		if (end >= this.src.length)
			throw new LexerError("Unterminated quoted string", { start, end });
		end++; // consume closing '
		// Check for B (binary) or H (hex) suffix
		const suffix = end < this.src.length ? this.src[end] : "";
		const kind =
			suffix === "B"
				? TokenKind.BinaryString
				: suffix === "H"
					? TokenKind.HexString
					: TokenKind.CharString;
		if (suffix === "B" || suffix === "H") end++;
		const text = this.src.slice(this.pos, end);
		this.pos = end;
		return {
			kind,
			span: { start, end: this.pos },
			leadingTrivia: trivia,
			text,
		};
	}

	private _readPunct(
		start: number,
		trivia: readonly Trivia[],
		cc: number,
	): Token {
		const make = (kind: TokenKind, len: number): Token => {
			const text = this.src.slice(this.pos, this.pos + len);
			this.pos += len;
			return {
				kind,
				span: { start, end: this.pos },
				leadingTrivia: trivia,
				text,
			};
		};

		switch (cc) {
			case LEFT_CURLY_BRACKET:
				return make(TokenKind.LeftBrace, 1);
			case RIGHT_CURLY_BRACKET:
				return make(TokenKind.RightBrace, 1);
			case LEFT_PARENTHESIS:
				return make(TokenKind.LeftParen, 1);
			case RIGHT_PARENTHESIS:
				return make(TokenKind.RightParen, 1);
			case COMMA:
				return make(TokenKind.Comma, 1);
			case SEMICOLON:
				return make(TokenKind.Semicolon, 1);
			case AT_SIGN:
				return make(TokenKind.At, 1);
			case VERTICAL_BAR:
				return make(TokenKind.Pipe, 1);
			case CARET:
				return make(TokenKind.Caret, 1);
			case EXCLAMATION_MARK:
				return make(TokenKind.Exclamation, 1);
			case LESS_THAN:
				return make(TokenKind.LessThan, 1);
			case GREATER_THAN:
				return make(TokenKind.GreaterThan, 1);
			case LEFT_SQUARE_BRACKET: {
				// [ or [[
				if (this.src.charCodeAt(this.pos + 1) === LEFT_SQUARE_BRACKET)
					return make(TokenKind.DoubleBracketLeft, 2);
				return make(TokenKind.LeftBracket, 1);
			}
			case RIGHT_SQUARE_BRACKET: {
				// ] or ]]
				if (this.src.charCodeAt(this.pos + 1) === RIGHT_SQUARE_BRACKET)
					return make(TokenKind.DoubleBracketRight, 2);
				return make(TokenKind.RightBracket, 1);
			}
			case PERIOD: {
				// . or .. or ...
				const next = this.src.charCodeAt(this.pos + 1);
				if (next === PERIOD) {
					const next2 = this.src.charCodeAt(this.pos + 2);
					if (next2 === PERIOD) return make(TokenKind.Ellipsis, 3);
					return make(TokenKind.DotDot, 2);
				}
				return make(TokenKind.Dot, 1);
			}
			case COLON: {
				// : or ::=
				if (
					this.src.charCodeAt(this.pos + 1) === COLON &&
					this.src.charCodeAt(this.pos + 2) === EQUALS
				) {
					return make(TokenKind.Assign, 3);
				}
				return make(TokenKind.Colon, 1);
			}
			case HYPHEN_MINUS: {
				// - (single minus, since comments are handled in trivia)
				return make(TokenKind.Minus, 1);
			}
			default: {
				// Unknown character — skip and return a synthetic token to allow recovery
				this.pos++;
				const text = this.src.slice(this.pos - 1, this.pos);
				return {
					kind: TokenKind.EndOfFile,
					span: { start, end: this.pos },
					leadingTrivia: trivia,
					text,
				};
			}
		}
	}

	private _readTrivia(): readonly Trivia[] {
		const result: Trivia[] = [];
		while (this.pos < this.src.length) {
			const cc = this.src.charCodeAt(this.pos);
			if (isAsciiWhitespace(cc)) {
				// Whitespace
				const start = this.pos;
				while (this.pos < this.src.length) {
					const c = this.src.charCodeAt(this.pos);
					if (!isAsciiWhitespace(c)) break;
					this.pos++;
				}
				result.push({
					kind: "whitespace",
					span: { start, end: this.pos },
					text: this.src.slice(start, this.pos),
				});
			} else if (
				cc === HYPHEN_MINUS &&
				this.src.charCodeAt(this.pos + 1) === HYPHEN_MINUS
			) {
				// Line comment --
				const start = this.pos;
				this.pos += 2;
				// Comments end at -- or newline
				while (this.pos < this.src.length) {
					const c = this.src.charCodeAt(this.pos);
					if (c === LF || c === CR) {
						this.pos++;
						break;
					}
					if (
						c === HYPHEN_MINUS &&
						this.src.charCodeAt(this.pos + 1) === HYPHEN_MINUS
					) {
						this.pos += 2;
						break;
					}
					this.pos++;
				}
				result.push({
					kind: "lineComment",
					span: { start, end: this.pos },
					text: this.src.slice(start, this.pos),
				});
			} else if (
				cc === SLASH &&
				this.src.charCodeAt(this.pos + 1) === ASTERISK
			) {
				// Block comment /* */
				const start = this.pos;
				this.pos += 2;
				let depth = 1;
				while (this.pos < this.src.length && depth > 0) {
					if (
						this.src.charCodeAt(this.pos) === SLASH &&
						this.src.charCodeAt(this.pos + 1) === ASTERISK
					) {
						depth++;
						this.pos += 2;
					} else if (
						this.src.charCodeAt(this.pos) === ASTERISK &&
						this.src.charCodeAt(this.pos + 1) === SLASH
					) {
						depth--;
						this.pos += 2;
					} else this.pos++;
				}
				if (depth > 0)
					throw new LexerError("Unterminated block comment", {
						start,
						end: this.pos,
					});
				result.push({
					kind: "blockComment",
					span: { start, end: this.pos },
					text: this.src.slice(start, this.pos),
				});
			} else {
				break;
			}
		}
		return result;
	}
}
