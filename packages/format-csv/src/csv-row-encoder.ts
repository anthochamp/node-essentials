import type { Encoder } from "@ac-kit/format-core";

import type { CsvCell, CsvOptions } from "./types.js";

function needsQuoting(text: string, delimiter: string): boolean {
	return (
		text.includes(delimiter) ||
		text.includes('"') ||
		text.includes("\n") ||
		text.includes("\r")
	);
}

function escapeField(cell: CsvCell, delimiter: string): string {
	const text = cell === null ? "" : String(cell);
	return needsQuoting(text, delimiter)
		? `"${text.replaceAll('"', '""')}"`
		: text;
}

/**
 * Formats one row as an RFC 4180 record, without a line terminator. Quotes a
 * field only when required.
 *
 * The single implementation of the CSV write grammar.
 */
export function formatCsvRow(
	row: readonly CsvCell[],
	delimiter: string,
): string {
	return row.map((cell) => escapeField(cell, delimiter)).join(delimiter);
}

/** Creates the CSV write half, emitting one terminated record per row. */
export function createCsvRowEncoder(
	options?: CsvOptions,
): Encoder<readonly CsvCell[], string> {
	const delimiter = options?.delimiter ?? ",";
	const newline = options?.newline ?? "\r\n";

	return {
		encode: (row) => `${formatCsvRow(row, delimiter)}${newline}`,
	};
}
