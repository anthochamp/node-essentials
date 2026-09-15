import type { Span } from "@ac-kit/core";

import type { CronField, CronFieldItem, CronSchedule } from "./ast.js";
import {
	CRON_FIELD_ORDER,
	CRON_FIELD_SPECS,
	type CronFieldSpec,
} from "./field-spec.js";
import { lexCronField } from "./lexer.js";
import { Token, TokenKind } from "./token.js";

export class CronParseError extends Error {
	readonly span: Span;
	constructor(message: string, span: Span) {
		super(message);
		this.name = "CronParseError";
		this.span = span;
	}
}

function resolveValue(token: Token, spec: CronFieldSpec): number {
	let value: number;
	if (token.kind === TokenKind.Number) {
		value = Number.parseInt(token.text, 10);
	} else if (token.kind === TokenKind.Name) {
		const resolved = spec.names?.get(token.text.toUpperCase());
		if (resolved === undefined) {
			throw new CronParseError(`Unknown name '${token.text}'`, token.span);
		}
		value = resolved;
	} else {
		throw new CronParseError(
			`Expected a number or name, got '${token.text}'`,
			token.span,
		);
	}

	if (spec.wrapMaxPlusOneToMin && value === spec.max + 1) {
		value = spec.min;
	}
	if (value < spec.min || value > spec.max) {
		throw new CronParseError(
			`Value ${value} out of range [${spec.min}, ${spec.max}]`,
			token.span,
		);
	}
	return value;
}

/** Parses one cron field (already split out of the full expression). */
export function parseCronField(field: string, spec: CronFieldSpec): CronField {
	const tokens = lexCronField(field);
	let index = 0;
	const peek = (): Token => tokens[index]!;
	const advance = (): Token => tokens[index++]!;

	function parseOptionalStep(): number | undefined {
		if (peek().kind !== TokenKind.Slash) return undefined;
		advance();
		const token = advance();
		if (token.kind !== TokenKind.Number) {
			throw new CronParseError(
				`Expected a step number, got '${token.text}'`,
				token.span,
			);
		}
		const step = Number.parseInt(token.text, 10);
		if (step <= 0) {
			throw new CronParseError(
				`Step must be positive, got ${step}`,
				token.span,
			);
		}
		return step;
	}

	function parseItem(): CronFieldItem {
		if (peek().kind === TokenKind.Asterisk) {
			advance();
			const step = parseOptionalStep();
			return step === undefined
				? { kind: "wildcard" }
				: { kind: "wildcard", step };
		}

		const from = resolveValue(advance(), spec);

		if (peek().kind === TokenKind.Hyphen) {
			advance();
			const to = resolveValue(advance(), spec);
			const step = parseOptionalStep();
			return step === undefined
				? { kind: "range", from, to }
				: { kind: "range", from, to, step };
		}

		const step = parseOptionalStep();
		if (step !== undefined) {
			// `value/step` is shorthand for "from value through the field's
			// maximum, stepped" (Vixie cron semantics).
			return { kind: "range", from, to: spec.max, step };
		}

		return { kind: "value", value: from };
	}

	const items: CronFieldItem[] = [parseItem()];
	while (peek().kind === TokenKind.Comma) {
		advance();
		items.push(parseItem());
	}
	if (peek().kind !== TokenKind.EndOfField) {
		throw new CronParseError(
			`Unexpected trailing input '${peek().text}'`,
			peek().span,
		);
	}
	return items;
}

/**
 * Parses a full 5-field cron expression (`minute hour dayOfMonth month
 * dayOfWeek`).
 */
export function parseCron(source: string): CronSchedule {
	const fields = source.trim().split(/\s+/);
	if (fields.length !== 5) {
		throw new CronParseError(`Expected 5 fields, got ${fields.length}`, {
			start: 0,
			end: source.length,
		});
	}

	const [minute, hour, dayOfMonth, month, dayOfWeek] = CRON_FIELD_ORDER.map(
		(kind, position) =>
			parseCronField(fields[position]!, CRON_FIELD_SPECS[kind]),
	) as [CronField, CronField, CronField, CronField, CronField];

	return { minute, hour, dayOfMonth, month, dayOfWeek };
}
