import { describe, expect, it } from "vitest";

import { lexRegexPattern, RegexLexerError } from "./lexer.js";
import { TokenKind } from "./token.js";

describe("lexRegexPattern", () => {
	it("tokenizes literal characters", () => {
		const tokens = lexRegexPattern("ab");
		expect(tokens.map((token) => token.kind)).toEqual([
			TokenKind.Char,
			TokenKind.Char,
			TokenKind.EndOfPattern,
		]);
	});

	it("tokenizes metacharacters", () => {
		const tokens = lexRegexPattern(".^$*+?|()");
		expect(tokens.map((token) => token.kind)).toEqual([
			TokenKind.Dot,
			TokenKind.Caret,
			TokenKind.Dollar,
			TokenKind.Star,
			TokenKind.Plus,
			TokenKind.Question,
			TokenKind.Pipe,
			TokenKind.LParen,
			TokenKind.RParen,
			TokenKind.EndOfPattern,
		]);
	});

	it("tokenizes a non-capturing group opener as one token", () => {
		const tokens = lexRegexPattern("(?:a)");
		expect(tokens[0]).toMatchObject({
			kind: TokenKind.NonCapturingLParen,
			text: "(?:",
		});
	});

	it("rejects lookaround/named-group syntax", () => {
		expect(() => lexRegexPattern("(?=a)")).toThrow(RegexLexerError);
		expect(() => lexRegexPattern("(?!a)")).toThrow(RegexLexerError);
		expect(() => lexRegexPattern("(?<a>x)")).toThrow(RegexLexerError);
	});

	it("decodes escaped metacharacters to literal Char tokens", () => {
		const tokens = lexRegexPattern("\\.");
		expect(tokens[0]).toMatchObject({ kind: TokenKind.Char, text: "." });
	});

	it("tokenizes shorthand escapes", () => {
		const tokens = lexRegexPattern("\\d\\w\\s");
		expect(tokens.slice(0, 3).map((token) => [token.kind, token.text])).toEqual(
			[
				[TokenKind.Shorthand, "d"],
				[TokenKind.Shorthand, "w"],
				[TokenKind.Shorthand, "s"],
			],
		);
	});

	it("throws on an unsupported escape", () => {
		expect(() => lexRegexPattern("\\p")).toThrow(RegexLexerError);
	});

	it("switches to class mode inside [...]", () => {
		const tokens = lexRegexPattern("[a-z^]");
		expect(tokens.map((token) => token.kind)).toEqual([
			TokenKind.LBracket,
			TokenKind.Char,
			TokenKind.Hyphen,
			TokenKind.Char,
			TokenKind.Caret,
			TokenKind.RBracket,
			TokenKind.EndOfPattern,
		]);
	});

	it("treats '.' and '*' as literal characters inside a class", () => {
		const tokens = lexRegexPattern("[.*]");
		expect(tokens.map((token) => token.kind)).toEqual([
			TokenKind.LBracket,
			TokenKind.Char,
			TokenKind.Char,
			TokenKind.RBracket,
			TokenKind.EndOfPattern,
		]);
	});

	it("groups digits inside a quantifier into a single Number token", () => {
		const tokens = lexRegexPattern("{12,34}");
		expect(tokens.map((token) => [token.kind, token.text])).toEqual([
			[TokenKind.LBrace, "{"],
			[TokenKind.Number, "12"],
			[TokenKind.Comma, ","],
			[TokenKind.Number, "34"],
			[TokenKind.RBrace, "}"],
			[TokenKind.EndOfPattern, ""],
		]);
	});

	it("does not group digits outside a quantifier", () => {
		const tokens = lexRegexPattern("123");
		expect(tokens.map((token) => token.kind)).toEqual([
			TokenKind.Char,
			TokenKind.Char,
			TokenKind.Char,
			TokenKind.EndOfPattern,
		]);
	});

	it("throws on an unterminated character class", () => {
		expect(() => lexRegexPattern("[abc")).toThrow(RegexLexerError);
	});

	it("throws on an unterminated quantifier", () => {
		expect(() => lexRegexPattern("a{2")).toThrow(RegexLexerError);
	});

	it("throws on a non-digit inside a quantifier", () => {
		expect(() => lexRegexPattern("a{x}")).toThrow(RegexLexerError);
	});

	it("throws on an unmatched closing brace", () => {
		expect(() => lexRegexPattern("a}")).toThrow(RegexLexerError);
	});

	it("throws on a trailing backslash", () => {
		expect(() => lexRegexPattern("a\\")).toThrow(RegexLexerError);
	});
});
