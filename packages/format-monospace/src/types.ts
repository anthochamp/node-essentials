export type TextAlign = "left" | "right" | "center";

export type CellPosition = {
	/** `-1` for the header row. */
	readonly row: number;
	readonly column: number;
	/** The field's machine name. */
	readonly field: string;
};

export type TableStyler = (text: string) => string;

export type TableCellStyler = (text: string, position: CellPosition) => string;

export type TableBorderStyle = "none" | "ascii" | "unicode" | "markdown-like";

export type RenderTableOptions = {
	/** Default `"none"` — columns separated by two spaces, no rules. */
	border?: TableBorderStyle;
	/**
	 * Applied after padding, so escape codes can never affect alignment. Widths
	 * are always computed from the unstyled text via `visibleWidth`.
	 */
	styleCell?: TableCellStyler;
	styleHeader?: TableCellStyler;
	styleTitle?: TableStyler;
	styleFootnote?: TableStyler;
	/** Rendered for `null`. Default `""`. */
	nullText?: string;
	/** Locale for number and date formatting. */
	locale?: string | string[];
	/**
	 * Overrides the alignment derived from a field's measurement scale, by field
	 * name. Quantities default to `"right"`, everything else to `"left"`.
	 */
	align?: Readonly<Record<string, TextAlign>>;
	/** Hard cap per field name; longer cells are truncated with an ellipsis. */
	maxWidth?: Readonly<Record<string, number>>;
};
