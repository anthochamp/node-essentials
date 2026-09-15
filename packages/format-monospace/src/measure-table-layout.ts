import type { DataFrame } from "@ac-kit/model-dataset";
import { columnCell } from "@ac-kit/model-dataset";

import { cellText } from "./_cell-text.js";
import type { ResolvedColumn } from "./resolve-columns.js";
import { resolveColumns } from "./resolve-columns.js";
import type { RenderTableOptions } from "./types.js";
import { visibleWidth } from "./visible-width.js";

/**
 * One column width per field, the max of the header and every rendered body
 * cell's visible width. O(r × f).
 */
export function measureTableLayout(
	frame: DataFrame,
	options?: RenderTableOptions,
): number[] {
	return measureColumnWidths(frame, resolveColumns(frame, options));
}

/**
 * The same measurement against columns resolved once — what a caller redrawing
 * one row at a time uses, so the `Intl` formatters are not rebuilt per frame.
 */
export function measureColumnWidths(
	frame: DataFrame,
	columns: readonly ResolvedColumn[],
): number[] {
	return columns.map((column, columnIndex) => {
		let width = visibleWidth(column.title);
		const values = frame.columns[columnIndex];
		if (values === undefined) {
			return width;
		}
		for (let rowIndex = 0; rowIndex < frame.rowCount; rowIndex++) {
			const text = cellText(columnCell(values, rowIndex), column);
			width = Math.max(width, visibleWidth(text));
		}
		return width;
	});
}
