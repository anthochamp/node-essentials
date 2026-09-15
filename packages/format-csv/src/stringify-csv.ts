import { formatCsvRow } from "./csv-row-encoder.js";
import type { CsvCell, CsvOptions } from "./types.js";

/**
 * Serializes rows of cells as RFC 4180 CSV. Quotes a field only when required.
 *
 * A utility over {@link formatCsvRow}: rows are joined rather than terminated,
 * so the result carries no trailing newline. Use `CsvPrintStream` where each
 * record should be terminated as it is emitted.
 */
export function stringifyCsv(
	rows: readonly (readonly CsvCell[])[],
	options?: CsvOptions,
): string {
	const delimiter = options?.delimiter ?? ",";
	const newline = options?.newline ?? "\r\n";

	return rows.map((row) => formatCsvRow(row, delimiter)).join(newline);
}
