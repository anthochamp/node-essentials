/**
 * A parsed INI document, in source order.
 *
 * The tree keeps everything the source contained — comments, blank lines, the
 * exact spelling of a section header, the order sections appeared in — because
 * a consumer that edits a file must be able to write back what it did not
 * touch, and a consumer whose semantics are order-dependent (EditorConfig
 * resolves later matching sections over earlier ones) cannot work from a
 * collapsed object.
 */
export type IniDocument = {
	readonly nodes: readonly IniNode[];

	/**
	 * Whether the source ended with a line terminator.
	 *
	 * Tracked rather than inferred, because "ends with a newline" and "has a
	 * final empty line" are different documents and a round trip must not turn
	 * one into the other.
	 */
	readonly trailingNewline: boolean;
};

/** One line of an INI document. */
export type IniNode = IniSection | IniProperty | IniComment | IniBlank;

/** A `[name]` header. Properties after it belong to it until the next header. */
export type IniSection = {
	readonly kind: "section";
	/** Header text with surrounding whitespace trimmed, escapes resolved. */
	readonly name: string;
	/** Raw text between the brackets, for a byte-exact reprint. */
	readonly raw: string;
	/** A trailing comment on the same line, without its marker. */
	readonly comment?: IniInlineComment;
	readonly span: IniSpan;
};

/** A `key = value` line. */
export type IniProperty = {
	readonly kind: "property";
	readonly key: string;
	/** `undefined` for a valueless key — `flag` with no `=`. */
	readonly value: string | undefined;
	/** Source text of the whole line, excluding any trailing comment. */
	readonly raw: string;
	readonly comment?: IniInlineComment;
	readonly span: IniSpan;
};

/** A whole-line comment. */
export type IniComment = {
	readonly kind: "comment";
	readonly marker: ";" | "#";
	/** Text after the marker, verbatim. */
	readonly text: string;
	readonly span: IniSpan;
};

/** A line with nothing but whitespace. */
export type IniBlank = {
	readonly kind: "blank";
	readonly raw: string;
	readonly span: IniSpan;
};

/** A comment sharing a line with a section header or property. */
export type IniInlineComment = {
	readonly marker: ";" | "#";
	readonly text: string;
	/** Whitespace between the value and the marker, so reprinting is exact. */
	readonly gap: string;
};

/** Half-open source offsets, excluding the line terminator. */
export type IniSpan = {
	readonly start: number;
	readonly end: number;
};
