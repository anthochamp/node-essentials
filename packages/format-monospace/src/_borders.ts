import type { ResolvedColumn } from "./resolve-columns.js";
import type { TableBorderStyle, TextAlign } from "./types.js";

type BorderChars = {
	/** Leading/trailing vertical character. Empty for `"none"`. */
	readonly edge: string;
	/** Between-cell separator, including its surrounding spaces. */
	readonly separator: string;
	/** Header rule character. Empty for `"none"` (no rule line at all). */
	readonly rule: string;
	/** Rule-line character at a column boundary. */
	readonly ruleJunction: string;
};

const BORDER_CHARS: Readonly<Record<TableBorderStyle, BorderChars>> = {
	none: { edge: "", separator: "  ", rule: "", ruleJunction: "" },
	ascii: { edge: "|", separator: " | ", rule: "-", ruleJunction: "+" },
	unicode: { edge: "│", separator: " │ ", rule: "─", ruleJunction: "┼" },
	"markdown-like": {
		edge: "|",
		separator: " | ",
		rule: "-",
		ruleJunction: "|",
	},
};

/**
 * Joins already-padded cells into one line, per `border`'s edge/separator
 * convention.
 */
export function joinCells(
	cells: readonly string[],
	border: TableBorderStyle,
): string {
	const chars = BORDER_CHARS[border];
	const joined = cells.join(chars.separator);
	return chars.edge === ""
		? joined.trimEnd()
		: `${chars.edge} ${joined} ${chars.edge}`;
}

function markdownDelimiterSegment(align: TextAlign, width: number): string {
	const dashes = "-".repeat(Math.max(width, 3));
	switch (align) {
		case "left":
			return `:${dashes.slice(1)}`;
		case "right":
			return `${dashes.slice(0, -1)}:`;
		case "center":
			return `:${dashes.slice(2)}:`;
	}
}

/**
 * The line rendered between the header and the body. `null` for `"none"`, which
 * has no rule at all.
 */
export function renderRuleLine(
	columns: readonly ResolvedColumn[],
	widths: readonly number[],
	border: TableBorderStyle,
): string | null {
	const chars = BORDER_CHARS[border];
	if (chars.rule === "") {
		return null;
	}

	if (border === "markdown-like") {
		const segments = widths.map((width, index) =>
			markdownDelimiterSegment(columns[index]?.align ?? "left", width),
		);
		return joinCells(segments, border);
	}

	const segments = widths.map((width) => chars.rule.repeat(width + 2));
	return `${chars.ruleJunction}${segments.join(chars.ruleJunction)}${chars.ruleJunction}`;
}
