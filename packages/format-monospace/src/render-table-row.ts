import type { Value } from "@ac-kit/model-dataset";

import { joinCells } from "./_borders.js";
import { renderBodyCells } from "./_render-body-cells.js";
import type { ResolvedColumn } from "./resolve-columns.js";
import type { RenderTableOptions } from "./types.js";

/**
 * Renders one body row against columns and a `layout` resolved once — for an
 * incremental renderer that redraws a single row without re-rendering the
 * table.
 *
 * `CellPosition.row` is always `0`: this function renders a single row in
 * isolation, so a caller that needs the real row index in `styleCell` should
 * bind it via its own closure over `options.styleCell`.
 */
export function renderTableRow(
	row: readonly Value[],
	rowIndex: number,
	columns: readonly ResolvedColumn[],
	layout: readonly number[],
	options?: Readonly<RenderTableOptions>,
): string {
	const border = options?.border ?? "none";

	return joinCells(
		renderBodyCells(row, rowIndex, columns, layout, options),
		border,
	);
}
