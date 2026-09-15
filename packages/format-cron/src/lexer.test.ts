import { describe, expect, it } from "vitest";

import { CronLexerError, lexCronField } from "./lexer.js";
import { TokenKind } from "./token.js";

describe("lexCronField", () => {
	it("tokenizes a wildcard", () => {
		const tokens = lexCronField("*");
		expect(tokens.map((token) => token.kind)).toEqual([
			TokenKind.Asterisk,
			TokenKind.EndOfField,
		]);
	});

	it("tokenizes a stepped wildcard", () => {
		const tokens = lexCronField("*/15");
		expect(tokens.map((token) => token.kind)).toEqual([
			TokenKind.Asterisk,
			TokenKind.Slash,
			TokenKind.Number,
			TokenKind.EndOfField,
		]);
		expect(tokens[2]!.text).toBe("15");
	});

	it("tokenizes a range with a step", () => {
		const tokens = lexCronField("1-10/2");
		expect(tokens.map((token) => token.kind)).toEqual([
			TokenKind.Number,
			TokenKind.Hyphen,
			TokenKind.Number,
			TokenKind.Slash,
			TokenKind.Number,
			TokenKind.EndOfField,
		]);
	});

	it("tokenizes a comma-separated list", () => {
		const tokens = lexCronField("MON,WED,FRI");
		expect(tokens.map((token) => token.kind)).toEqual([
			TokenKind.Name,
			TokenKind.Comma,
			TokenKind.Name,
			TokenKind.Comma,
			TokenKind.Name,
			TokenKind.EndOfField,
		]);
	});

	it("reports the span of each token", () => {
		const tokens = lexCronField("5-10");
		expect(tokens[0]!.span).toEqual({ start: 0, end: 1 });
		expect(tokens[1]!.span).toEqual({ start: 1, end: 2 });
		expect(tokens[2]!.span).toEqual({ start: 2, end: 4 });
	});

	it("throws CronLexerError on an unexpected character", () => {
		expect(() => lexCronField("1?2")).toThrow(CronLexerError);
	});
});
