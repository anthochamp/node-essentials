import type { DataFrame, FieldDescriptor } from "@ac-kit/model-dataset";
import {
	columnCell,
	createFieldFormatter,
	fieldTitle,
	isNumericField,
} from "@ac-kit/model-dataset";

import { stringifyCsv } from "./stringify-csv.js";
import type { CsvCell, CsvOptions } from "./types.js";

/**
 * CSV is interchange, not display: a locale that groups thousands or uses a
 * decimal comma would collide with the delimiter and corrupt the file.
 */
const INTERCHANGE_LOCALE = "en-US";

function interchangeField_(field: FieldDescriptor): FieldDescriptor {
	if (!isNumericField(field)) {
		return field;
	}
	return { ...field, format: { ...field.format, useGrouping: false } };
}

/**
 * Renders a {@link DataFrame} as RFC 4180 CSV: one line per row, one column per
 * field, in the frame's own field order.
 *
 * Cells go through their field's own formatter, so precision matches every
 * other rendering of the same frame — but digit grouping is disabled and the
 * locale defaults to a machine-neutral one, since a reader of this file is a
 * parser rather than a person. Pass `locale` to override. Frame metadata has no
 * CSV form and is dropped.
 */
export function renderFrameAsCsv(
	frame: DataFrame,
	options?: CsvOptions,
): string {
	const includeHeader = options?.header ?? true;
	const formatters = frame.fields.map((field) =>
		createFieldFormatter(interchangeField_(field), {
			locale: options?.locale ?? INTERCHANGE_LOCALE,
		}),
	);

	const rows: CsvCell[][] = [];
	if (includeHeader) {
		rows.push(frame.fields.map((field) => fieldTitle(field)));
	}

	for (let rowIndex = 0; rowIndex < frame.rowCount; rowIndex++) {
		const row = Array.from<CsvCell>({ length: frame.fields.length });
		for (let index = 0; index < frame.fields.length; index++) {
			const column = frame.columns[index];
			const format = formatters[index];
			row[index] =
				column === undefined || format === undefined
					? null
					: format(columnCell(column, rowIndex));
		}
		rows.push(row);
	}

	return stringifyCsv(rows, options);
}
