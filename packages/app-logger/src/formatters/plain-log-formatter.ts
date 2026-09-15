import { inspect } from "node:util";

import type { Formatter } from "@ac-kit/app-report";
import { plainLineFormatter } from "@ac-kit/app-report";
import { formatError } from "@ac-kit/core";

import type { LogRecord } from "../log-record.js";

/**
 * Renders `record`'s attributes/error/stack trace as extra indented lines, or
 * `[]` if it has none.
 */
export function logRecordDetailLines(record: LogRecord): string[] {
	const lines: string[] = [];

	if (record.attributes && Object.keys(record.attributes).length > 0) {
		lines.push(
			`  attributes: ${inspect(record.attributes, { compact: true, breakLength: Infinity })}`,
		);
	}

	if (record.error !== undefined) {
		lines.push(`  error: ${formatError(record.error)}`);
	}

	if (record.stackTrace) {
		lines.push(`  call stack:`);
		for (const frame of record.stackTrace) {
			lines.push(`  ${frame}`);
		}
	}

	return lines;
}

/**
 * Renders a `LogRecord`'s level and message as one line, plus its
 * attributes/error/stack trace as extra lines — no ANSI escape codes.
 *
 * Non-`"data"` events (scope lifecycle, output, attachments) delegate to
 * `plainLineFormatter`.
 */
export const plainLogFormatter: Formatter<LogRecord> = (event, context) => {
	if (event.kind !== "data") {
		return plainLineFormatter(event, context);
	}

	const record = event.data;
	return [
		`[${record.level.toUpperCase()}] ${record.message}`,
		...logRecordDetailLines(record),
	].join("\n");
};
