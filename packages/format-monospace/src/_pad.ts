import type { TextAlign } from "./types.js";
import { visibleWidth } from "./visible-width.js";

/**
 * Pads `text` to `width` visible columns, using `visibleWidth` rather than
 * `.length`.
 */
export function padToVisibleWidth(
	text: string,
	width: number,
	align: TextAlign,
): string {
	const gap = Math.max(0, width - visibleWidth(text));

	if (align === "right") {
		return " ".repeat(gap) + text;
	}

	if (align === "center") {
		const left = Math.floor(gap / 2);
		const right = gap - left;
		return " ".repeat(left) + text + " ".repeat(right);
	}

	return text + " ".repeat(gap);
}
