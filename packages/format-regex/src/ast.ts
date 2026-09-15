import type { Span } from "@ac-kit/core";

/** A `\d`/`\D`/`\w`/`\W`/`\s`/`\S` shorthand character class. */
export type ShorthandClass = "d" | "D" | "w" | "W" | "s" | "S";

export interface RegexLiteral {
	readonly kind: "literal";
	readonly char: string;
	readonly span: Span;
}

/** `.` — any character except a line terminator. */
export interface RegexAnyChar {
	readonly kind: "any";
	readonly span: Span;
}

export interface RegexShorthand {
	readonly kind: "shorthand";
	readonly value: ShorthandClass;
	readonly span: Span;
}

/** `^` (start) or `$` (end) — a zero-width position assertion. */
export interface RegexAnchor {
	readonly kind: "anchor";
	readonly type: "start" | "end";
	readonly span: Span;
}

export interface CharClassCharItem {
	readonly kind: "char";
	readonly char: string;
}

export interface CharClassRangeItem {
	readonly kind: "range";
	readonly from: string;
	readonly to: string;
}

export interface CharClassShorthandItem {
	readonly kind: "shorthand";
	readonly value: ShorthandClass;
}

export type CharClassItem =
	| CharClassCharItem
	| CharClassRangeItem
	| CharClassShorthandItem;

/** `[...]` or `[^...]`. */
export interface RegexCharClass {
	readonly kind: "charClass";
	readonly negated: boolean;
	readonly items: readonly CharClassItem[];
	readonly span: Span;
}

/** `(...)` (capturing) or `(?:...)` (non-capturing). */
export interface RegexGroup {
	readonly kind: "group";
	readonly capturing: boolean;
	/**
	 * 1-based capture index, in left-to-right order of opening parens. Only set
	 * when `capturing`.
	 */
	readonly index?: number;
	readonly body: AnyRegexNode;
	readonly span: Span;
}

/** `a|b|c`. */
export interface RegexAlternation {
	readonly kind: "alternation";
	readonly alternatives: readonly AnyRegexNode[];
	readonly span: Span;
}

/** Implicit concatenation of adjacent atoms. */
export interface RegexConcat {
	readonly kind: "concat";
	readonly items: readonly AnyRegexNode[];
	readonly span: Span;
}

/** `*`, `+`, `?`, `{m}`, `{m,}`, or `{m,n}`, optionally lazy (`?` suffix). */
export interface RegexQuantified {
	readonly kind: "quantified";
	readonly body: AnyRegexNode;
	readonly min: number;
	/** `undefined` means unbounded (`*`, `+`, `{m,}`). */
	readonly max: number | undefined;
	readonly lazy: boolean;
	readonly span: Span;
}

export type AnyRegexNode =
	| RegexLiteral
	| RegexAnyChar
	| RegexShorthand
	| RegexAnchor
	| RegexCharClass
	| RegexGroup
	| RegexAlternation
	| RegexConcat
	| RegexQuantified;

/** The root of a parsed pattern. */
export interface RegexPattern {
	readonly kind: "pattern";
	readonly body: AnyRegexNode;
	/** Number of capturing groups in the pattern. */
	readonly groupCount: number;
	readonly span: Span;
}
