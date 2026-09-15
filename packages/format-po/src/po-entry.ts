/**
 * A GNU gettext PO file as a syntax tree.
 *
 * A PO file is a flat list of entries; the header is simply the entry whose
 * `id` is empty, and its `strings[0]` holds the `Key: value` block. Nothing
 * here interprets that block or resolves a translation — see `parsePoHeader`
 * and `parsePluralForms` for the first, and a message-catalogue package for the
 * second.
 */

/** Where a message was extracted from, as recorded by a `#:` comment. */
export type PoReference = {
	readonly file: string;
	/** `null` when the reference names a file without a line. */
	readonly line: number | null;
};

/** The `#|` block: what the entry said before `msgmerge` rewrote it. */
export type PoPrevious = {
	readonly context: string | null;
	readonly id: string | null;
	readonly idPlural: string | null;
};

export type PoEntry = {
	/** `# ` comments, written by hand. */
	readonly translatorComments: readonly string[];
	/** `#.` comments, extracted from the source by `xgettext`. */
	readonly extractedComments: readonly string[];
	readonly references: readonly PoReference[];
	/** `#,` flags — `fuzzy`, `c-format`, `no-python-brace-format`, … */
	readonly flags: readonly string[];
	readonly previous: PoPrevious | null;
	/** `msgctxt`, which disambiguates two messages with the same `msgid`. */
	readonly context: string | null;
	readonly id: string;
	/** `msgid_plural`, present exactly when the entry has plural forms. */
	readonly idPlural: string | null;
	/**
	 * `msgstr`, or `msgstr[0]`…`msgstr[n]` for a plural entry. A single empty
	 * string means untranslated, which is not the same as absent.
	 */
	readonly strings: readonly string[];
	/** Whether the entry was commented out with `#~`. */
	readonly obsolete: boolean;
};
