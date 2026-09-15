import type { DataFrame } from "@ac-kit/model-dataset";
import { dataFrameRow } from "@ac-kit/model-dataset";

import { joinCells, renderRuleLine } from "./_borders.js";
import { padToVisibleWidth } from "./_pad.js";
import { renderBodyCells } from "./_render-body-cells.js";
import { measureColumnWidths } from "./measure-table-layout.js";
import { resolveColumns } from "./resolve-columns.js";
import type { RenderTableOptions } from "./types.js";

/**
 * Renders a {@link DataFrame} as aligned monospace text: an optional title, a
 * header row, an optional rule line, the body rows, and any footnotes.
 *
 * Column widths are the max of the header and every body cell's visible
 * (grapheme-aware) width, so `styleCell`/`styleHeader` can add ANSI codes
 * without breaking alignment — padding is always computed from the unstyled
 * text first. Alignment comes from each field's measurement scale unless
 * `options.align` overrides it.
 */
export function renderTable(
	frame: DataFrame,
	options?: Readonly<RenderTableOptions>,
): string {
	const border = options?.border ?? "none";
	const columns = resolveColumns(frame, options);
	const layout = measureColumnWidths(frame, columns);

	const headerCells = columns.map((column, index) => {
		const width = layout[index] ?? 0;
		const padded = padToVisibleWidth(column.title, width, column.align);

		if (!options?.styleHeader) {
			return padded;
		}

		return options.styleHeader(padded, {
			row: -1,
			column: index,
			field: column.field.name,
		});
	});

	const lines: string[] = [];

	let title = frame.meta?.title;
	if (title !== undefined) {
		if (options?.styleTitle) {
			title = options.styleTitle(title);
		}

		lines.push(title);
	}

	lines.push(joinCells(headerCells, border));

	const ruleLine = renderRuleLine(columns, layout, border);
	if (ruleLine !== null) {
		lines.push(ruleLine);
	}

	for (let rowIndex = 0; rowIndex < frame.rowCount; rowIndex++) {
		lines.push(
			joinCells(
				renderBodyCells(
					dataFrameRow(frame, rowIndex),
					rowIndex,
					columns,
					layout,
					options,
				),
				border,
			),
		);
	}

	const footnotes = frame.meta?.footnotes;
	if (footnotes !== undefined) {
		for (const footnote of footnotes) {
			if (options?.styleFootnote) {
				lines.push(options.styleFootnote(footnote));
			} else {
				lines.push(footnote);
			}
		}
	}

	return lines.join("\n");
}
