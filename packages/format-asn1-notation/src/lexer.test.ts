import { describe, it, expect } from "vitest";

import { Lexer, LexerError } from "./index.js";
import { TokenKind } from "./index.js";

describe("Lexer — basic tokens", () => {
	function lex(src: string) {
		const l = new Lexer(src);
		const tokens = [];
		while (true) {
			const t = l.next();
			tokens.push(t);
			if (t.kind === TokenKind.EndOfFile) break;
		}
		return tokens;
	}

	it("produces EndOfFile on empty input", () => {
		const tokens = lex("");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]!.kind).toBe(TokenKind.EndOfFile);
	});

	it("lexes identifiers", () => {
		expect(lex("foo")[0]!.kind).toBe(TokenKind.Identifier);
		expect(lex("foo")[0]!.text).toBe("foo");
	});

	it("lexes type references", () => {
		expect(lex("MyType")[0]!.kind).toBe(TokenKind.TypeReference);
		expect(lex("MyType")[0]!.text).toBe("MyType");
	});

	it("lexes keywords (uppercase)", () => {
		expect(lex("SEQUENCE")[0]!.kind).toBe(TokenKind.KwSequence);
		expect(lex("OPTIONAL")[0]!.kind).toBe(TokenKind.KwOptional);
		expect(lex("BEGIN")[0]!.kind).toBe(TokenKind.KwBegin);
		expect(lex("END")[0]!.kind).toBe(TokenKind.KwEnd);
	});

	it("lexes mixed-case keywords", () => {
		expect(lex("UTF8String")[0]!.kind).toBe(TokenKind.KwUtf8String);
		expect(lex("GeneralizedTime")[0]!.kind).toBe(TokenKind.KwGeneralizedTime);
		expect(lex("UTCTime")[0]!.kind).toBe(TokenKind.KwUtcTime);
	});

	it("lexes numbers", () => {
		const t = lex("42")[0]!;
		expect(t.kind).toBe(TokenKind.Number);
		expect(t.text).toBe("42");
	});

	it("lexes ::= as Assign", () => {
		expect(lex("::=")[0]!.kind).toBe(TokenKind.Assign);
	});

	it("lexes .. and ...", () => {
		expect(lex("..")[0]!.kind).toBe(TokenKind.DotDot);
		expect(lex("...")[0]!.kind).toBe(TokenKind.Ellipsis);
	});

	it("lexes [[ and ]]", () => {
		expect(lex("[[")[0]!.kind).toBe(TokenKind.DoubleBracketLeft);
		expect(lex("]]")[0]!.kind).toBe(TokenKind.DoubleBracketRight);
	});

	it("attaches whitespace as leading trivia", () => {
		const tokens = lex("  foo");
		expect(tokens[0]!.leadingTrivia).toHaveLength(1);
		expect(tokens[0]!.leadingTrivia[0]!.kind).toBe("whitespace");
	});

	it("attaches line comment as leading trivia", () => {
		const tokens = lex("-- this is a comment\nfoo");
		expect(tokens[0]!.leadingTrivia[0]!.kind).toBe("lineComment");
	});

	it("lexes binary string '0011'B", () => {
		const t = lex("'0011'B")[0]!;
		expect(t.kind).toBe(TokenKind.BinaryString);
	});

	it("lexes hex string 'DEADBEEF'H", () => {
		const t = lex("'DEADBEEF'H")[0]!;
		expect(t.kind).toBe(TokenKind.HexString);
	});

	it('lexes char string "hello"', () => {
		const t = lex('"hello"')[0]!;
		expect(t.kind).toBe(TokenKind.CharString);
		expect(t.text).toBe('"hello"');
	});

	it("lexes hyphenated keywords MINUS-INFINITY", () => {
		expect(lex("MINUS-INFINITY")[0]!.kind).toBe(TokenKind.KwMinusInfinity);
	});

	it("throws LexerError on unterminated string", () => {
		expect(() => lex('"hello')).toThrowError(LexerError);
	});

	it("spans are correct for a sequence of tokens", () => {
		const tokens = lex("AB ::= INTEGER");
		// AB → TypeReference, ::= → Assign, INTEGER → KwInteger
		expect(tokens[0]!.kind).toBe(TokenKind.TypeReference);
		expect(tokens[0]!.span).toEqual({ start: 0, end: 2 });
		expect(tokens[1]!.kind).toBe(TokenKind.Assign);
		expect(tokens[1]!.span).toEqual({ start: 3, end: 6 });
	});
});
