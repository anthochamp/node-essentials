import { truncateCore, type TruncateOptions } from "@ac-kit/core";

import { graphemeSegments, visibleWidth } from "./visible-width.js";

/**
 * Truncates `text` to at most `maxWidth` columns, counting wide characters (CJK
 * ideographs, fullwidth characters, emoji) as two columns and combining marks
 * as zero columns.
 *
 * `maxWidth` counts monospace columns, not UTF-16 code units or code points — a
 * surrogate pair can be split across the cut. Use `truncate` for a
 * code-unit-based cut.
 *
 * @param text The input string to be truncated.
 * @param maxWidth The maximum allowed width of the string including the
 *   ellipsis.
 * @param options Options to customize the ellipsis behavior.
 * @returns The truncated string with ellipsis if needed.
 */
export function truncateToWidth(
	text: string,
	maxWidth: number,
	options?: TruncateOptions,
): string {
	if (visibleWidth(text) <= maxWidth) {
		return text;
	}

	const ellipsisString = options?.ellipsisString ?? "…";

	return truncateCore({
		atoms: graphemeSegments(text),
		measure: visibleWidth,
		ellipsisString,
		ellipsisMeasure: visibleWidth(ellipsisString),
		maxMeasure: maxWidth,
		position: options?.position ?? "end",
		wordCutting: options?.wordCutting ?? true,
		strictLength: options?.strictLength ?? true,
	});
}
