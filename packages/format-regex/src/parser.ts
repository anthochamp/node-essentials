import type { Span } from "@ac-kit/core";

import type {
	AnyRegexNode,
	CharClassItem,
	RegexPattern,
	ShorthandClass,
} from "./ast.js";
import { lexRegexPattern } from "./lexer.js";
import { Token, TokenKind } from "./token.js";

export class RegexParseError extends Error {
	readonly span: Span;
	constructor(message: string, span: Span) {
		super(message);
		this.name = "RegexParseError";
		this.span = span;
	}
}

function describeToken(token: Token): string {
	return token.kind === TokenKind.EndOfPattern
		? "end of pattern"
		: `'${token.text}'`;
}

/** Parses a regex pattern into a {@link RegexPattern} AST. */
export function parseRegex(source: string): RegexPattern {
	const tokens = lexRegexPattern(source);
	let index = 0;
	let groupCount = 0;

	const peek = (): Token => tokens[index]!;
	const advance = (): Token => tokens[index++]!;
	function expect(kind: TokenKind, what: string): Token {
		const token = advance();
		if (token.kind !== kind) {
			throw new RegexParseError(
				`Expected ${what}, got ${describeToken(token)}`,
				token.span,
			);
		}
		return token;
	}

	function isConcatTerminator(kind: TokenKind): boolean {
		return (
			kind === TokenKind.Pipe ||
			kind === TokenKind.RParen ||
			kind === TokenKind.EndOfPattern
		);
	}

	function parseAlternation(): AnyRegexNode {
		const first = parseConcat();
		if (peek().kind !== TokenKind.Pipe) return first;

		const alternatives: AnyRegexNode[] = [first];
		while (peek().kind === TokenKind.Pipe) {
			advance();
			alternatives.push(parseConcat());
		}
		const last = alternatives[alternatives.length - 1]!;
		return {
			kind: "alternation",
			alternatives,
			span: { start: first.span.start, end: last.span.end },
		};
	}

	function parseConcat(): AnyRegexNode {
		const start = peek().span.start;
		const items: AnyRegexNode[] = [];
		while (!isConcatTerminator(peek().kind)) {
			items.push(parseQuantified());
		}
		if (items.length === 1) return items[0]!;
		const end = items.length > 0 ? items[items.length - 1]!.span.end : start;
		return { kind: "concat", items, span: { start, end } };
	}

	function parseQuantified(): AnyRegexNode {
		const atom = parseAtom();
		const quantifierToken = peek();

		let min: number;
		let max: number | undefined;
		let quantEnd = atom.span.end;

		if (quantifierToken.kind === TokenKind.Star) {
			min = 0;
			max = undefined;
			advance();
			quantEnd = quantifierToken.span.end;
		} else if (quantifierToken.kind === TokenKind.Plus) {
			min = 1;
			max = undefined;
			advance();
			quantEnd = quantifierToken.span.end;
		} else if (quantifierToken.kind === TokenKind.Question) {
			min = 0;
			max = 1;
			advance();
			quantEnd = quantifierToken.span.end;
		} else if (quantifierToken.kind === TokenKind.LBrace) {
			advance();
			const minToken = expect(TokenKind.Number, "a number");
			min = Number.parseInt(minToken.text, 10);
			if (peek().kind === TokenKind.Comma) {
				advance();
				max =
					peek().kind === TokenKind.Number
						? Number.parseInt(advance().text, 10)
						: undefined;
			} else {
				max = min;
			}
			quantEnd = expect(TokenKind.RBrace, "'}'").span.end;
		} else {
			return atom;
		}

		if (max !== undefined && max < min) {
			throw new RegexParseError(
				`Quantifier max (${max}) is less than min (${min})`,
				{ start: atom.span.start, end: quantEnd },
			);
		}

		let lazy = false;
		if (peek().kind === TokenKind.Question) {
			lazy = true;
			quantEnd = advance().span.end;
		}

		return {
			kind: "quantified",
			body: atom,
			min,
			max,
			lazy,
			span: { start: atom.span.start, end: quantEnd },
		};
	}

	function parseAtom(): AnyRegexNode {
		const token = peek();
		switch (token.kind) {
			case TokenKind.Char:
				advance();
				return { kind: "literal", char: token.text, span: token.span };
			case TokenKind.Dot:
				advance();
				return { kind: "any", span: token.span };
			case TokenKind.Shorthand:
				advance();
				return {
					kind: "shorthand",
					value: token.text as ShorthandClass,
					span: token.span,
				};
			case TokenKind.Caret:
				advance();
				return { kind: "anchor", type: "start", span: token.span };
			case TokenKind.Dollar:
				advance();
				return { kind: "anchor", type: "end", span: token.span };
			case TokenKind.LBracket:
				return parseCharClass();
			case TokenKind.LParen:
			case TokenKind.NonCapturingLParen: {
				const capturing = token.kind === TokenKind.LParen;
				advance();
				const groupIndex = capturing ? ++groupCount : undefined;
				const body = parseAlternation();
				const closeParen = expect(TokenKind.RParen, "')'");
				return {
					kind: "group",
					capturing,
					index: groupIndex,
					body,
					span: { start: token.span.start, end: closeParen.span.end },
				};
			}
			default:
				throw new RegexParseError(
					`Unexpected token ${describeToken(token)}`,
					token.span,
				);
		}
	}

	function parseCharClass(): AnyRegexNode {
		const open = expect(TokenKind.LBracket, "'['");
		let negated = false;
		if (peek().kind === TokenKind.Caret) {
			advance();
			negated = true;
		}

		if (peek().kind === TokenKind.RBracket) {
			throw new RegexParseError("Empty character class", {
				start: open.span.start,
				end: peek().span.end,
			});
		}

		const items: CharClassItem[] = [];
		while (peek().kind !== TokenKind.RBracket) {
			if (peek().kind === TokenKind.EndOfPattern) {
				throw new RegexParseError("Unterminated character class", {
					start: open.span.start,
					end: peek().span.end,
				});
			}
			if (peek().kind === TokenKind.Shorthand) {
				const shorthandToken = advance();
				items.push({
					kind: "shorthand",
					value: shorthandToken.text as ShorthandClass,
				});
				continue;
			}

			const fromToken = advance();
			if (
				fromToken.kind !== TokenKind.Char &&
				fromToken.kind !== TokenKind.Hyphen
			) {
				throw new RegexParseError(
					`Unexpected token in character class ${describeToken(fromToken)}`,
					fromToken.span,
				);
			}

			if (peek().kind === TokenKind.Hyphen) {
				const savedIndex = index;
				advance();
				if (peek().kind === TokenKind.Char) {
					const toToken = advance();
					items.push({ kind: "range", from: fromToken.text, to: toToken.text });
					continue;
				}
				// Trailing '-' before ']' (e.g. "[a-]") is a literal hyphen, not a range.
				index = savedIndex;
			}
			items.push({ kind: "char", char: fromToken.text });
		}
		const close = advance();
		return {
			kind: "charClass",
			negated,
			items,
			span: { start: open.span.start, end: close.span.end },
		};
	}

	const body = parseAlternation();
	if (peek().kind !== TokenKind.EndOfPattern) {
		throw new RegexParseError(
			`Unexpected token ${describeToken(peek())}`,
			peek().span,
		);
	}
	return {
		kind: "pattern",
		body,
		groupCount,
		span: { start: 0, end: source.length },
	};
}
