/**
 * The properties EditorConfig defines, with their spec spellings resolved to
 * values a program can act on.
 *
 * Every field is optional: an unset property means the file said nothing about
 * it, which is different from setting it off. `"unset"` in the source also
 * lands here as absent, since that is exactly what it means.
 */
export type EditorConfigProperties = {
	/** `indent_style`. */
	readonly indentStyle?: "tab" | "space";

	/** `indent_size`; `"tab"` defers to {@link tabWidth}. */
	readonly indentSize?: number | "tab";

	/** `tab_width`. Defaults to `indent_size` when that is a number. */
	readonly tabWidth?: number;

	/** `end_of_line`. */
	readonly endOfLine?: "lf" | "crlf" | "cr";

	/** `charset`. */
	readonly charset?: string;

	/** `trim_trailing_whitespace`. */
	readonly trimTrailingWhitespace?: boolean;

	/** `insert_final_newline`. */
	readonly insertFinalNewline?: boolean;

	/** `max_line_length`; `"off"` where the spec allows disabling it. */
	readonly maxLineLength?: number | "off";

	/** Properties the spec does not define, preserved with their raw values. */
	readonly unknown?: Readonly<Record<string, string>>;
};

/** The line terminator an {@link EditorConfigProperties.endOfLine} names. */
export const END_OF_LINE_SEQUENCES = {
	lf: "\n",
	crlf: "\r\n",
	cr: "\r",
} as const satisfies Record<string, string>;
