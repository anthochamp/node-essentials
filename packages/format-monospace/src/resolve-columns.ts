import type { DataFrame, FieldDescriptor, Value } from "@ac-kit/model-dataset";
import {
	createFieldFormatter,
	fieldTitle,
	isNumericField,
	unitLabel,
} from "@ac-kit/model-dataset";

import type { RenderTableOptions, TextAlign } from "./types.js";

/**
 * One column with everything resolved that would otherwise be recomputed per
 * cell — notably the `Intl` formatter, which costs far more to build than to
 * use.
 */
export type ResolvedColumn = {
	/** The field descriptor for this column. */
	field: FieldDescriptor;

	/** The title of the column. */
	title: string;

	/** The text alignment for this column. */
	align: TextAlign;

	/** The maximum width for this column, or `undefined` if unconstrained. */
	maxWidth: number | undefined;

	/** The formatter function for this column's values. */
	format: (value: Value) => string;
};

/**
 * Resolves a frame's fields into render-ready columns.
 *
 * Call once per table — or once per live region, reused across redraws — and
 * pass the result to `measureResolvedLayout` and `renderTableRow`.
 */
export function resolveColumns(
	frame: DataFrame,
	options?: Readonly<RenderTableOptions>,
): ResolvedColumn[] {
	return frame.fields.map((field) => ({
		field,
		title:
			isNumericField(field) && field.unit
				? `${fieldTitle(field)} (${unitLabel(field.unit)})`
				: fieldTitle(field),
		align:
			options?.align?.[field.name] ??
			(isNumericField(field) ? "right" : "left"),
		maxWidth: options?.maxWidth?.[field.name],
		format: createFieldFormatter(field, {
			locale: options?.locale,
			nullText: options?.nullText ?? "",
		}),
	}));
}
