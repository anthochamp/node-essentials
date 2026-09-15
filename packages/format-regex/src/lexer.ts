import { isAsciiDigit, type Span } from "@ac-kit/core";

import { Token, TokenKind } from "./token.js";

export class RegexLexerError extends Error {
	readonly span: Span;
	constructor(message: string, span: Span) {
		super(message);
		this.name = "RegexLexerError";
		this.span = span;
	}
}

const UNESCAPABLE_METACHARS = new Set([
	".",
	"*",
	"+",
	"?",
	"(",
	")",
	"[",
	"]",
	"{",
	"}",
	"|",
	"^",
	"$",
	"\\",
	"/",
]);
const SHORTHAND_LETTERS = new Set(["d", "D", "w", "W", "s", "S"]);
const NAMED_ESCAPES: Readonly<Record<string, string>> = {
	n: "\n",
	r: "\r",
	t: "\t",
	f: "\f",
	v: "\v",
	"0": "\0",
};

/**
 * Tokenizes a regex pattern.
 *
 * Two context-sensitive regions change how bytes are tokenized: inside a
 * `[...]` character class (`classDepth > 0`), where `-`/`^` are only special
 * there and everything else is literal; and inside a `{...}` quantifier
 * (`inBrace`), where only digits/`,` are meaningful. Neither region can nest
 * inside the other in this grammar.
 */
export function lexRegexPattern(source: string): Token[] {
	const tokens: Token[] = [];
	let pos = 0;
	let classDepth = 0;
	let inBrace = false;

	function readEscape(): Token {
		const start = pos;
		const escapeChar = source[pos + 1];
		if (escapeChar === undefined) {
			throw new RegexLexerError("Trailing backslash", {
				start,
				end: start + 1,
			});
		}
		if (SHORTHAND_LETTERS.has(escapeChar)) {
			pos += 2;
			return {
				kind: TokenKind.Shorthand,
				text: escapeChar,
				span: { start, end: pos },
			};
		}
		if (UNESCAPABLE_METACHARS.has(escapeChar)) {
			pos += 2;
			return {
				kind: TokenKind.Char,
				text: escapeChar,
				span: { start, end: pos },
			};
		}
		const named = NAMED_ESCAPES[escapeChar];
		if (named !== undefined) {
			pos += 2;
			return { kind: TokenKind.Char, text: named, span: { start, end: pos } };
		}
		throw new RegexLexerError(`Unsupported escape '\\${escapeChar}'`, {
			start,
			end: start + 2,
		});
	}

	while (pos < source.length) {
		const start = pos;
		const char = source[pos]!;

		if (char === "\\") {
			tokens.push(readEscape());
			continue;
		}

		if (classDepth > 0) {
			if (char === "]") {
				classDepth--;
				tokens.push({
					kind: TokenKind.RBracket,
					text: "]",
					span: { start, end: start + 1 },
				});
			} else if (char === "-") {
				tokens.push({
					kind: TokenKind.Hyphen,
					text: "-",
					span: { start, end: start + 1 },
				});
			} else if (char === "^") {
				tokens.push({
					kind: TokenKind.Caret,
					text: "^",
					span: { start, end: start + 1 },
				});
			} else {
				tokens.push({
					kind: TokenKind.Char,
					text: char,
					span: { start, end: start + 1 },
				});
			}
			pos++;
			continue;
		}

		if (inBrace) {
			if (isAsciiDigit(char.charCodeAt(0))) {
				let end = pos + 1;
				while (end < source.length && isAsciiDigit(source.charCodeAt(end)))
					end++;
				tokens.push({
					kind: TokenKind.Number,
					text: source.slice(pos, end),
					span: { start, end },
				});
				pos = end;
			} else if (char === ",") {
				tokens.push({
					kind: TokenKind.Comma,
					text: ",",
					span: { start, end: start + 1 },
				});
				pos++;
			} else if (char === "}") {
				inBrace = false;
				tokens.push({
					kind: TokenKind.RBrace,
					text: "}",
					span: { start, end: start + 1 },
				});
				pos++;
			} else {
				throw new RegexLexerError(
					`Unexpected character '${char}' inside a quantifier (only digits and ',' are allowed)`,
					{ start, end: start + 1 },
				);
			}
			continue;
		}

		switch (char) {
			case ".":
				tokens.push({
					kind: TokenKind.Dot,
					text: ".",
					span: { start, end: start + 1 },
				});
				pos++;
				break;
			case "^":
				tokens.push({
					kind: TokenKind.Caret,
					text: "^",
					span: { start, end: start + 1 },
				});
				pos++;
				break;
			case "$":
				tokens.push({
					kind: TokenKind.Dollar,
					text: "$",
					span: { start, end: start + 1 },
				});
				pos++;
				break;
			case "*":
				tokens.push({
					kind: TokenKind.Star,
					text: "*",
					span: { start, end: start + 1 },
				});
				pos++;
				break;
			case "+":
				tokens.push({
					kind: TokenKind.Plus,
					text: "+",
					span: { start, end: start + 1 },
				});
				pos++;
				break;
			case "?":
				tokens.push({
					kind: TokenKind.Question,
					text: "?",
					span: { start, end: start + 1 },
				});
				pos++;
				break;
			case "|":
				tokens.push({
					kind: TokenKind.Pipe,
					text: "|",
					span: { start, end: start + 1 },
				});
				pos++;
				break;
			case "(": {
				if (source[pos + 1] === "?") {
					if (source[pos + 2] === ":") {
						tokens.push({
							kind: TokenKind.NonCapturingLParen,
							text: "(?:",
							span: { start, end: start + 3 },
						});
						pos += 3;
						break;
					}
					const marker = source.slice(pos, Math.min(pos + 3, source.length));
					throw new RegexLexerError(
						`Unsupported group syntax '${marker}' (lookaround and named groups are not supported)`,
						{ start, end: Math.min(start + 3, source.length) },
					);
				}
				tokens.push({
					kind: TokenKind.LParen,
					text: "(",
					span: { start, end: start + 1 },
				});
				pos++;
				break;
			}
			case ")":
				tokens.push({
					kind: TokenKind.RParen,
					text: ")",
					span: { start, end: start + 1 },
				});
				pos++;
				break;
			case "[":
				classDepth++;
				tokens.push({
					kind: TokenKind.LBracket,
					text: "[",
					span: { start, end: start + 1 },
				});
				pos++;
				break;
			case "{":
				inBrace = true;
				tokens.push({
					kind: TokenKind.LBrace,
					text: "{",
					span: { start, end: start + 1 },
				});
				pos++;
				break;
			case "}":
				throw new RegexLexerError("Unmatched '}'", { start, end: start + 1 });
			default:
				tokens.push({
					kind: TokenKind.Char,
					text: char,
					span: { start, end: start + 1 },
				});
				pos++;
		}
	}

	if (classDepth > 0) {
		throw new RegexLexerError("Unterminated character class", {
			start: pos,
			end: pos,
		});
	}
	if (inBrace) {
		throw new RegexLexerError("Unterminated quantifier", {
			start: pos,
			end: pos,
		});
	}

	tokens.push({
		kind: TokenKind.EndOfPattern,
		text: "",
		span: { start: pos, end: pos },
	});
	return tokens;
}
