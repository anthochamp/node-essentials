import { describe, expect, it } from "vitest";

import { CborNotationLexerError, lexCborNotation } from "./lexer.js";
import { TokenKind } from "./token.js";

describe("lexCborNotation", () => {
	it("tokenizes integers and floats", () => {
		const tokens = lexCborNotation("42 -7 1.5 1e3");
		expect(tokens.slice(0, 4).map((token) => [token.kind, token.text])).toEqual(
			[
				[TokenKind.Number, "42"],
				[TokenKind.Number, "-7"],
				[TokenKind.Number, "1.5"],
				[TokenKind.Number, "1e3"],
			],
		);
	});

	it("tokenizes a text string with JSON-style escapes", () => {
		const tokens = lexCborNotation('"a\\"b\\n"');
		expect(tokens[0]).toMatchObject({ kind: TokenKind.Text, text: 'a"b\n' });
	});

	it("tokenizes a hex byte string, ignoring internal whitespace (EDN G.1)", () => {
		const tokens = lexCborNotation("h'01 02 03'");
		expect(tokens[0]).toMatchObject({
			kind: TokenKind.ByteStringHex,
			text: "010203",
		});
	});

	it("tokenizes a base64 byte string", () => {
		const tokens = lexCborNotation("b64'aGVsbG8'");
		expect(tokens[0]).toMatchObject({
			kind: TokenKind.ByteStringBase64,
			text: "aGVsbG8",
		});
	});

	it("tokenizes keywords as identifiers", () => {
		const tokens = lexCborNotation(
			"true false null undefined Infinity -Infinity NaN simple",
		);
		expect(tokens.slice(0, 8).map((token) => token.text)).toEqual([
			"true",
			"false",
			"null",
			"undefined",
			"Infinity",
			"-Infinity",
			"NaN",
			"simple",
		]);
	});

	it("tokenizes punctuation", () => {
		const tokens = lexCborNotation("[]{}(),:");
		expect(tokens.slice(0, 8).map((token) => token.kind)).toEqual([
			TokenKind.LeftBracket,
			TokenKind.RightBracket,
			TokenKind.LeftBrace,
			TokenKind.RightBrace,
			TokenKind.LeftParen,
			TokenKind.RightParen,
			TokenKind.Comma,
			TokenKind.Colon,
		]);
	});

	it("attaches a comment as leading trivia on the next token (EDN G.6)", () => {
		const tokens = lexCborNotation("/hello/ 1");
		expect(tokens[0]).toMatchObject({
			kind: TokenKind.Number,
			text: "1",
			leadingComments: ["hello"],
		});
	});

	it("throws on an unterminated comment", () => {
		expect(() => lexCborNotation("/unterminated")).toThrow(
			CborNotationLexerError,
		);
	});

	it("throws on an unterminated text string", () => {
		expect(() => lexCborNotation('"unterminated')).toThrow(
			CborNotationLexerError,
		);
	});

	it("throws on an unterminated byte string", () => {
		expect(() => lexCborNotation("h'0102")).toThrow(CborNotationLexerError);
	});

	it("throws on an unexpected character in a byte string", () => {
		expect(() => lexCborNotation("h'zz'")).toThrow(CborNotationLexerError);
	});

	it("throws on an unexpected character", () => {
		expect(() => lexCborNotation("#")).toThrow(CborNotationLexerError);
	});
});
