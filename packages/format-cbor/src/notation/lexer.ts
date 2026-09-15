import {
	isAsciiAlpha,
	isAsciiAlphaNumeric,
	isAsciiBase64Char,
	isAsciiDigit,
	isAsciiHexDigit,
	type Span,
} from "@ac-kit/core";

import { Token, TokenKind } from "./token.js";

export class CborNotationLexerError extends Error {
	readonly span: Span;
	constructor(message: string, span: Span) {
		super(message);
		this.name = "CborNotationLexerError";
		this.span = span;
	}
}

const JSON_ESCAPES: Readonly<Record<string, string>> = {
	'"': '"',
	"\\": "\\",
	"/": "/",
	b: "\b",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "\t",
};

/**
 * Tokenizes CBOR diagnostic notation (RFC 8949 §8), extended with EDN comments
 * (RFC 8610 Appendix G.6: `/ text /`, considered whitespace) and byte-string
 * whitespace tolerance (Appendix G.1). Other EDN extensions (hex/octal/binary
 * numbers, concatenated strings, embedded-CBOR `<<...>>`, unprefixed
 * text-as-bytes, base32/base32hex) are out of scope — see the package README.
 */
export function lexCborNotation(source: string): Token[] {
	const tokens: Token[] = [];
	let pos = 0;
	let pendingComments: string[] = [];

	function skipTrivia(): void {
		while (pos < source.length) {
			const char = source[pos]!;
			if (char === " " || char === "\t" || char === "\n" || char === "\r") {
				pos++;
				continue;
			}
			if (char === "/") {
				const start = pos + 1;
				const end = source.indexOf("/", start);
				if (end === -1) {
					throw new CborNotationLexerError("Unterminated comment", {
						start: pos,
						end: source.length,
					});
				}
				pendingComments.push(source.slice(start, end));
				pos = end + 1;
				continue;
			}
			break;
		}
	}

	function takeComments(): string[] {
		const comments = pendingComments;
		pendingComments = [];
		return comments;
	}

	function readQuoted(
		prefixLength: number,
		allowed: (code: number) => boolean,
		kind: TokenKind,
	): Token {
		const start = pos - prefixLength;
		pos++; // consume opening '
		let text = "";
		while (true) {
			if (pos >= source.length) {
				throw new CborNotationLexerError("Unterminated byte string", {
					start,
					end: source.length,
				});
			}
			const char = source[pos]!;
			if (char === "'") {
				pos++;
				break;
			}
			if (char === " " || char === "\t" || char === "\n" || char === "\r") {
				pos++;
				continue;
			}
			if (char === "/") {
				const end = source.indexOf("/", pos + 1);
				if (end === -1) {
					throw new CborNotationLexerError("Unterminated comment", {
						start: pos,
						end: source.length,
					});
				}
				pos = end + 1;
				continue;
			}
			if (!allowed(source.charCodeAt(pos))) {
				throw new CborNotationLexerError(
					`Unexpected character '${char}' in byte string`,
					{
						start: pos,
						end: pos + 1,
					},
				);
			}
			text += char;
			pos++;
		}
		return {
			kind,
			text,
			span: { start, end: pos },
			leadingComments: takeComments(),
		};
	}

	function readTextString(): Token {
		const start = pos;
		pos++; // consume opening "
		let text = "";
		while (true) {
			if (pos >= source.length) {
				throw new CborNotationLexerError("Unterminated text string", {
					start,
					end: source.length,
				});
			}
			const char = source[pos]!;
			if (char === '"') {
				pos++;
				break;
			}
			if (char === "\\") {
				const escapeChar = source[pos + 1];
				if (escapeChar === undefined) {
					throw new CborNotationLexerError(
						"Trailing backslash in text string",
						{
							start: pos,
							end: pos + 1,
						},
					);
				}
				if (escapeChar === "u") {
					const hex = source.slice(pos + 2, pos + 6);
					if (hex.length !== 4 || !/^[0-9a-fA-F]{4}$/.test(hex)) {
						throw new CborNotationLexerError("Invalid \\u escape", {
							start: pos,
							end: pos + 6,
						});
					}
					text += String.fromCharCode(Number.parseInt(hex, 16));
					pos += 6;
					continue;
				}
				const decoded = JSON_ESCAPES[escapeChar];
				if (decoded === undefined) {
					throw new CborNotationLexerError(
						`Unsupported escape '\\${escapeChar}'`,
						{
							start: pos,
							end: pos + 2,
						},
					);
				}
				text += decoded;
				pos += 2;
				continue;
			}
			text += char;
			pos++;
		}
		return {
			kind: TokenKind.Text,
			text,
			span: { start, end: pos },
			leadingComments: takeComments(),
		};
	}

	function readNumber(): Token {
		const start = pos;
		if (source[pos] === "-") pos++;
		while (pos < source.length && isAsciiDigit(source.charCodeAt(pos))) pos++;
		if (source[pos] === "." && isAsciiDigit(source.charCodeAt(pos + 1))) {
			pos++;
			while (pos < source.length && isAsciiDigit(source.charCodeAt(pos))) pos++;
		}
		if (source[pos] === "e" || source[pos] === "E") {
			const save = pos;
			pos++;
			if (source[pos] === "+" || source[pos] === "-") pos++;
			if (isAsciiDigit(source.charCodeAt(pos))) {
				while (pos < source.length && isAsciiDigit(source.charCodeAt(pos)))
					pos++;
			} else {
				pos = save;
			}
		}
		return {
			kind: TokenKind.Number,
			text: source.slice(start, pos),
			span: { start, end: pos },
			leadingComments: takeComments(),
		};
	}

	function readIdentifier(): Token {
		const start = pos;
		if (source[pos] === "-") pos++;
		while (pos < source.length && isAsciiAlphaNumeric(source.charCodeAt(pos)))
			pos++;
		return {
			kind: TokenKind.Identifier,
			text: source.slice(start, pos),
			span: { start, end: pos },
			leadingComments: takeComments(),
		};
	}

	while (true) {
		skipTrivia();
		if (pos >= source.length) {
			tokens.push({
				kind: TokenKind.EndOfInput,
				text: "",
				span: { start: pos, end: pos },
				leadingComments: takeComments(),
			});
			break;
		}

		const start = pos;
		const char = source[pos]!;

		if (char === '"') {
			tokens.push(readTextString());
			continue;
		}
		if (
			isAsciiDigit(source.charCodeAt(pos)) ||
			(char === "-" && isAsciiDigit(source.charCodeAt(pos + 1)))
		) {
			tokens.push(readNumber());
			continue;
		}
		if (
			isAsciiAlpha(source.charCodeAt(pos)) ||
			(char === "-" && isAsciiAlpha(source.charCodeAt(pos + 1)))
		) {
			const identifier = readIdentifier();
			if (identifier.text === "h" && source[pos] === "'") {
				tokens.push(readQuoted(1, isAsciiHexDigit, TokenKind.ByteStringHex));
				continue;
			}
			if (identifier.text === "b64" && source[pos] === "'") {
				tokens.push(
					readQuoted(3, isAsciiBase64Char, TokenKind.ByteStringBase64),
				);
				continue;
			}
			tokens.push(identifier);
			continue;
		}

		const single = (kind: TokenKind): Token => ({
			kind,
			text: char,
			span: { start, end: start + 1 },
			leadingComments: takeComments(),
		});
		switch (char) {
			case "[":
				tokens.push(single(TokenKind.LeftBracket));
				break;
			case "]":
				tokens.push(single(TokenKind.RightBracket));
				break;
			case "{":
				tokens.push(single(TokenKind.LeftBrace));
				break;
			case "}":
				tokens.push(single(TokenKind.RightBrace));
				break;
			case "(":
				tokens.push(single(TokenKind.LeftParen));
				break;
			case ")":
				tokens.push(single(TokenKind.RightParen));
				break;
			case ",":
				tokens.push(single(TokenKind.Comma));
				break;
			case ":":
				tokens.push(single(TokenKind.Colon));
				break;
			default:
				throw new CborNotationLexerError(`Unexpected character '${char}'`, {
					start,
					end: start + 1,
				});
		}
		pos++;
	}

	return tokens;
}
