import type { DataFrame, FieldDescriptor } from "@ac-kit/model-dataset";
import {
	columnCell,
	createFieldFormatter,
	fieldTitle,
	isNumericField,
} from "@ac-kit/model-dataset";

import type { MarkdownTableOptions } from "./types.js";

/** A literal `|` breaks the column structure; a literal newline breaks the row. */
function escapeCell(text: string): string {
	return text.replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ");
}

function delimiterCell(field: FieldDescriptor, alignment: boolean): string {
	if (!alignment) {
		return "---";
	}
	return isNumericField(field) ? "--:" : ":--";
}

/**
 * Renders a {@link DataFrame} as a GFM (GitHub-Flavored Markdown) pipe table.
 *
 * Column alignment is derived from each field's measurement scale rather than
 * declared: a quantity reads right-aligned, a category left. The frame's
 * `meta.title` becomes a heading and `meta.footnotes` follow the table.
 */
export function renderFrameAsMarkdown(
	frame: DataFrame,
	options?: MarkdownTableOptions,
): string {
	const alignment = options?.alignment ?? true;
	const formatters = frame.fields.map((field) =>
		createFieldFormatter(field, { locale: options?.locale }),
	);

	const headerRow = `| ${frame.fields.map((field) => escapeCell(fieldTitle(field))).join(" | ")} |`;
	const delimiterRow = `| ${frame.fields.map((field) => delimiterCell(field, alignment)).join(" | ")} |`;

	const bodyRows: string[] = [];
	for (let rowIndex = 0; rowIndex < frame.rowCount; rowIndex++) {
		const cells = frame.fields.map((_field, index) => {
			const column = frame.columns[index];
			const format = formatters[index];
			if (column === undefined || format === undefined) {
				return "";
			}
			return escapeCell(format(columnCell(column, rowIndex)));
		});
		bodyRows.push(`| ${cells.join(" | ")} |`);
	}

	const lines = [headerRow, delimiterRow, ...bodyRows];

	const title = frame.meta?.title;
	if (title !== undefined) {
		lines.unshift(`# ${title}`, "");
	}

	const footnotes = frame.meta?.footnotes;
	if (footnotes !== undefined && footnotes.length > 0) {
		lines.push("", ...footnotes);
	}

	return lines.join("\n");
}
