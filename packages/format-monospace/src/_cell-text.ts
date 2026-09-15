import type { Value } from "@ac-kit/model-dataset";

import type { ResolvedColumn } from "./resolve-columns.js";
import { truncateToWidth } from "./truncate-to-width.js";

/** Renders one cell to display text through its column's own formatter. */
export function cellText(cell: Value, column: ResolvedColumn): string {
	const text = column.format(cell);
	return column.maxWidth === undefined
		? text
		: truncateToWidth(text, column.maxWidth);
}
