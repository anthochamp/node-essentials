import { clamp, isAsciiWhitespace, SEMICOLON } from "@ac-kit/core";

import { PluralFormsSyntaxError } from "./errors.js";

/** How a language picks which `msgstr[i]` applies to a given count. */
export type PluralForms = {
	/** `nplurals` — how many plural forms the language distinguishes. */
	readonly count: number;
	/**
	 * Which `msgstr` index applies to `n`, always within `[0, count)`. An
	 * expression that answers outside that range is clamped, as gettext does, so
	 * a mistranslated header cannot index past the entry's strings.
	 */
	readonly select: (n: number) => number;
};

/** What gettext assumes when a catalogue has no `Plural-Forms` field: English. */
export const DEFAULT_PLURAL_FORMS: PluralForms = {
	count: 2,
	select: (n) => (n === 1 ? 0 : 1),
};

/** Compiled operand or subexpression, evaluated against one count. */
type Evaluate_ = (n: number) => number;

/**
 * Binary operators by increasing precedence. Within a level the longer spelling
 * comes first, so `<=` is not read as `<` followed by a stray `=`.
 */
const BINARY_LEVELS_: readonly (readonly string[])[] = [
	["||"],
	["&&"],
	["==", "!="],
	["<=", ">=", "<", ">"],
	["+", "-"],
	["*", "/", "%"],
];

const NPLURALS_ = /\bnplurals\s*=\s*(\d+)/;
const PLURAL_ = /\bplural\s*=/;
/** Sticky, so a literal is matched at the cursor without slicing the source. */
const INTEGER_ = /\d+/y;

/**
 * Parses a `Plural-Forms` header field into a compiled selector.
 *
 * The value is a C conditional expression over the single variable `n`, which
 * is evaluated with integer semantics: `/` truncates, `%` is a remainder, and a
 * comparison yields `0` or `1`. It is parsed and compiled to a closure tree
 * once, never handed to `eval` or `new Function` — a translation catalogue is
 * external input, and every library that has taken that shortcut shipped a code
 * execution hole with it.
 *
 * Selecting is then O(1) in the size of the expression's tree, which is small
 * by construction.
 *
 * @throws {PluralFormsSyntaxError} When the field or the expression does not
 *   parse.
 */
export function parsePluralForms(text: string): PluralForms {
	const nplurals = NPLURALS_.exec(text);
	if (nplurals === null) {
		throw new PluralFormsSyntaxError(text, 0, "expected nplurals");
	}

	const count = Number(nplurals[1]);
	if (count < 1) {
		throw new PluralFormsSyntaxError(
			text,
			nplurals.index,
			"nplurals must be at least one",
		);
	}

	const plural = PLURAL_.exec(text);
	if (plural === null) {
		throw new PluralFormsSyntaxError(text, 0, "expected plural");
	}

	const reader = new Reader_(text, plural.index + plural[0].length);
	const expression = reader.readExpression();
	reader.expectEnd();

	const highest = count - 1;
	return {
		count,
		select: (n) => clamp(Math.trunc(expression(n)), 0, highest),
	};
}

/** Reads the plural expression, leaving the cursor on the trailing `;`. */
class Reader_ {
	constructor(
		private readonly source: string,
		private at: number,
	) {}

	readExpression(): Evaluate_ {
		const condition = this.readBinary_(0);
		if (!this.tryText_("?")) {
			return condition;
		}

		const whenTrue = this.readExpression();
		this.expect_(":");
		const whenFalse = this.readExpression();
		return (n) => (condition(n) !== 0 ? whenTrue(n) : whenFalse(n));
	}

	expectEnd(): void {
		this.skipSpace_();
		if (this.source.charCodeAt(this.at) === SEMICOLON) {
			this.at++;
			this.skipSpace_();
		}
		if (this.at < this.source.length) {
			this.fail_("unexpected trailing input");
		}
	}

	private readBinary_(level: number): Evaluate_ {
		const operators = BINARY_LEVELS_[level];
		if (operators === undefined) {
			return this.readUnary_();
		}

		let left = this.readBinary_(level + 1);
		for (;;) {
			const operator = operators.find((candidate) => this.tryText_(candidate));
			if (operator === undefined) {
				return left;
			}
			left = combine_(operator, left, this.readBinary_(level + 1));
		}
	}

	private readUnary_(): Evaluate_ {
		this.skipSpace_();
		if (
			this.source.startsWith("!", this.at) &&
			this.source[this.at + 1] !== "="
		) {
			this.at++;
			const operand = this.readUnary_();
			return (n) => (operand(n) === 0 ? 1 : 0);
		}
		return this.readPrimary_();
	}

	private readPrimary_(): Evaluate_ {
		this.skipSpace_();

		if (this.tryText_("(")) {
			const inner = this.readExpression();
			this.expect_(")");
			return inner;
		}

		if (this.tryText_("n")) {
			return (n) => n;
		}

		const digits = this.match_(INTEGER_);
		if (digits === null) {
			this.fail_("expected n, a number, or a parenthesised expression");
		}
		const literal = Number(digits);
		return () => literal;
	}

	/** Matches a sticky pattern at the cursor, advancing past it on success. */
	private match_(pattern: RegExp): string | null {
		pattern.lastIndex = this.at;
		const match = pattern.exec(this.source);
		if (match === null) {
			return null;
		}
		this.at = pattern.lastIndex;
		return match[0];
	}

	private tryText_(text: string): boolean {
		this.skipSpace_();
		if (!this.source.startsWith(text, this.at)) {
			return false;
		}
		this.at += text.length;
		return true;
	}

	private expect_(text: string): void {
		if (!this.tryText_(text)) {
			this.fail_(`expected ${JSON.stringify(text)}`);
		}
	}

	private skipSpace_(): void {
		while (
			this.at < this.source.length &&
			isAsciiWhitespace(this.source.charCodeAt(this.at))
		) {
			this.at++;
		}
	}

	private fail_(detail: string): never {
		throw new PluralFormsSyntaxError(this.source, this.at, detail);
	}
}

function combine_(
	operator: string,
	left: Evaluate_,
	right: Evaluate_,
): Evaluate_ {
	switch (operator) {
		case "||":
			return (n) => (left(n) !== 0 || right(n) !== 0 ? 1 : 0);
		case "&&":
			return (n) => (left(n) !== 0 && right(n) !== 0 ? 1 : 0);
		case "==":
			return (n) => (left(n) === right(n) ? 1 : 0);
		case "!=":
			return (n) => (left(n) !== right(n) ? 1 : 0);
		case "<=":
			return (n) => (left(n) <= right(n) ? 1 : 0);
		case ">=":
			return (n) => (left(n) >= right(n) ? 1 : 0);
		case "<":
			return (n) => (left(n) < right(n) ? 1 : 0);
		case ">":
			return (n) => (left(n) > right(n) ? 1 : 0);
		case "+":
			return (n) => left(n) + right(n);
		case "-":
			return (n) => left(n) - right(n);
		case "*":
			return (n) => left(n) * right(n);
		case "/":
			return (n) => Math.trunc(left(n) / right(n));
		default:
			return (n) => left(n) % right(n);
	}
}
