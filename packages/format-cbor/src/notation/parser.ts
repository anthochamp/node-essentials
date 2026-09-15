import type { Span } from "@ac-kit/core";

import type { DiagNode } from "./diag-node.js";
import { lexCborNotation } from "./lexer.js";
import { Token, TokenKind } from "./token.js";

export class CborNotationParseError extends Error {
	readonly span: Span;
	constructor(message: string, span: Span) {
		super(message);
		this.name = "CborNotationParseError";
		this.span = span;
	}
}

function describeToken(token: Token): string {
	return token.kind === TokenKind.EndOfInput
		? "end of input"
		: `'${token.text}'`;
}

function decodeHexByteString(text: string): Uint8Array {
	if (text.length % 2 !== 0) {
		throw new CborNotationParseError(
			`Hex byte string has an odd number of digits`,
			{
				start: 0,
				end: 0,
			},
		);
	}
	return Uint8Array.fromHex(text.toLowerCase());
}

function decodeBase64ByteString(text: string): Uint8Array {
	const alphabet = /[-_]/.test(text) ? "base64url" : "base64";
	return Uint8Array.fromBase64(text, { alphabet });
}

/**
 * Parses CBOR diagnostic notation (see `lexCborNotation` for the supported
 * subset).
 */
export function parseCborNotation(source: string): DiagNode {
	const tokens = lexCborNotation(source);
	let index = 0;

	const peek = (): Token => tokens[index]!;
	const peekAt = (offset: number): Token =>
		tokens[Math.min(index + offset, tokens.length - 1)]!;
	const advance = (): Token => tokens[index++]!;
	function expect(kind: TokenKind, what: string): Token {
		const token = advance();
		if (token.kind !== kind) {
			throw new CborNotationParseError(
				`Expected ${what}, got ${describeToken(token)}`,
				token.span,
			);
		}
		return token;
	}

	function parseArray(): DiagNode {
		const open = expect(TokenKind.LeftBracket, "'['");
		const items: DiagNode[] = [];
		if (peek().kind !== TokenKind.RightBracket) {
			items.push(parseValue());
			while (peek().kind === TokenKind.Comma) {
				advance();
				if (peek().kind === TokenKind.RightBracket) break; // trailing comma
				items.push(parseValue());
			}
		}
		const close = expect(TokenKind.RightBracket, "']'");
		return {
			kind: "array",
			items,
			span: { start: open.span.start, end: close.span.end },
			leadingComments: open.leadingComments,
		};
	}

	function parseMap(): DiagNode {
		const open = expect(TokenKind.LeftBrace, "'{'");
		const entries: [DiagNode, DiagNode][] = [];
		if (peek().kind !== TokenKind.RightBrace) {
			entries.push(parseMapEntry());
			while (peek().kind === TokenKind.Comma) {
				advance();
				if (peek().kind === TokenKind.RightBrace) break; // trailing comma
				entries.push(parseMapEntry());
			}
		}
		const close = expect(TokenKind.RightBrace, "'}'");
		return {
			kind: "map",
			entries,
			span: { start: open.span.start, end: close.span.end },
			leadingComments: open.leadingComments,
		};
	}

	function parseMapEntry(): [DiagNode, DiagNode] {
		const key = parseValue();
		expect(TokenKind.Colon, "':'");
		const value = parseValue();
		return [key, value];
	}

	function parseValue(): DiagNode {
		const token = peek();

		switch (token.kind) {
			case TokenKind.Number: {
				if (peekAt(1).kind === TokenKind.LeftParen) return parseTag();
				advance();
				const isFloat = /[.eE]/.test(token.text);
				return isFloat
					? {
							kind: "float",
							value: Number(token.text),
							span: token.span,
							leadingComments: token.leadingComments,
						}
					: {
							kind: "int",
							value: BigInt(token.text),
							span: token.span,
							leadingComments: token.leadingComments,
						};
			}
			case TokenKind.Text:
				advance();
				return {
					kind: "text",
					value: token.text,
					span: token.span,
					leadingComments: token.leadingComments,
				};
			case TokenKind.ByteStringHex:
				advance();
				return {
					kind: "bytes",
					value: decodeHexByteString(token.text),
					span: token.span,
					leadingComments: token.leadingComments,
				};
			case TokenKind.ByteStringBase64:
				advance();
				return {
					kind: "bytes",
					value: decodeBase64ByteString(token.text),
					span: token.span,
					leadingComments: token.leadingComments,
				};
			case TokenKind.LeftBracket:
				return parseArray();
			case TokenKind.LeftBrace:
				return parseMap();
			case TokenKind.Identifier:
				return parseIdentifierValue();
			default:
				throw new CborNotationParseError(
					`Unexpected token ${describeToken(token)}`,
					token.span,
				);
		}
	}

	function parseTag(): DiagNode {
		const numberToken = advance();
		expect(TokenKind.LeftParen, "'('");
		const value = parseValue();
		const close = expect(TokenKind.RightParen, "')'");
		return {
			kind: "tag",
			tag: BigInt(numberToken.text),
			value,
			span: { start: numberToken.span.start, end: close.span.end },
			leadingComments: numberToken.leadingComments,
		};
	}

	function parseIdentifierValue(): DiagNode {
		const token = advance();
		switch (token.text) {
			case "true":
				return {
					kind: "bool",
					value: true,
					span: token.span,
					leadingComments: token.leadingComments,
				};
			case "false":
				return {
					kind: "bool",
					value: false,
					span: token.span,
					leadingComments: token.leadingComments,
				};
			case "null":
				return {
					kind: "null",
					span: token.span,
					leadingComments: token.leadingComments,
				};
			case "undefined":
				return {
					kind: "undefined",
					span: token.span,
					leadingComments: token.leadingComments,
				};
			case "Infinity":
				return {
					kind: "float",
					value: Infinity,
					span: token.span,
					leadingComments: token.leadingComments,
				};
			case "-Infinity":
				return {
					kind: "float",
					value: -Infinity,
					span: token.span,
					leadingComments: token.leadingComments,
				};
			case "NaN":
				return {
					kind: "float",
					value: Number.NaN,
					span: token.span,
					leadingComments: token.leadingComments,
				};
			case "simple": {
				expect(TokenKind.LeftParen, "'('");
				const numberToken = expect(TokenKind.Number, "a simple value number");
				const close = expect(TokenKind.RightParen, "')'");
				return {
					kind: "simple",
					value: Number(numberToken.text),
					span: { start: token.span.start, end: close.span.end },
					leadingComments: token.leadingComments,
				};
			}
			default:
				throw new CborNotationParseError(
					`Unknown identifier '${token.text}'`,
					token.span,
				);
		}
	}

	const value = parseValue();
	if (peek().kind !== TokenKind.EndOfInput) {
		throw new CborNotationParseError(
			`Unexpected trailing token ${describeToken(peek())}`,
			peek().span,
		);
	}
	return value;
}
