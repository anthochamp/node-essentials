import type { Value } from "@ac-kit/model-dataset";

import { cellText } from "./_cell-text.js";
import { padToVisibleWidth } from "./_pad.js";
import type { ResolvedColumn } from "./resolve-columns.js";
import type { RenderTableOptions } from "./types.js";

/**
 * Padded, styled cell text for one body row — shared by `renderTable` and
 * `renderTableRow`.
 */
export function renderBodyCells(
	row: readonly Value[],
	rowIndex: number,
	columns: readonly ResolvedColumn[],
	layout: readonly number[],
	options?: Readonly<RenderTableOptions>,
): string[] {
	return columns.map((column, index) => {
		const width = layout[index] ?? 0;
		const text = cellText(row[index] ?? null, column);
		const padded = padToVisibleWidth(text, width, column.align);

		if (!options?.styleCell) {
			return padded;
		}

		return options.styleCell(padded, {
			row: rowIndex,
			column: index,
			field: column.field.name,
		});
	});
}
