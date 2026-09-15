import type { Column, DataFrame, Value } from "@ac-kit/model-dataset";
import {
	columnCell,
	createFieldFormatter,
	fieldTitle,
} from "@ac-kit/model-dataset";

/** How many rows a fallback table shows before it stops being readable. */
const MAX_ROWS = 50;

/**
 * `model-chart`'s universal fallback: when no spec in a chain is drawable, the
 * frame itself is still worth showing.
 *
 * Truncated rather than paginated — this is a degraded view, and a reader who
 * needs every row is better served by the example's own source.
 *
 * O(rows x fields), with one `Intl` formatter built per column rather than per
 * cell.
 */
export function renderFrameTable(frame: DataFrame): HTMLTableElement {
	const table = document.createElement("table");

	const head = table.createTHead().insertRow();
	for (const field of frame.fields) {
		const cell = document.createElement("th");
		cell.textContent = fieldTitle(field);
		head.append(cell);
	}

	const formatters: ((value: Value) => string)[] = frame.fields.map((field) =>
		createFieldFormatter(field),
	);

	const body = table.createTBody();
	const shown = Math.min(frame.rowCount, MAX_ROWS);
	for (let rowIndex = 0; rowIndex < shown; rowIndex++) {
		const row = body.insertRow();
		for (let fieldIndex = 0; fieldIndex < frame.fields.length; fieldIndex++) {
			const format = formatters[fieldIndex] as (value: Value) => string;
			const value = columnCell(frame.columns[fieldIndex] as Column, rowIndex);
			row.insertCell().textContent = format(value);
		}
	}

	if (frame.rowCount > shown) {
		table.createCaption().textContent = `${shown} of ${frame.rowCount} rows`;
	}

	return table;
}
