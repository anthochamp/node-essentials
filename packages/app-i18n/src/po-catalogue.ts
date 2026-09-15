import {
	DEFAULT_PLURAL_FORMS,
	parsePluralForms,
	parsePoHeader,
	type PoEntry,
} from "@ac-kit/format-po";

import {
	createMessageCatalogue,
	type MessageCatalogue,
	messageKey,
} from "./message-catalogue.js";

/** BCP 47's own tag for "the language is not known". */
const UNDETERMINED_ = "und";

export type PoCatalogueOptions = {
	/** Overrides the header's `Language` field, or supplies one when it has none. */
	readonly locale?: string | null;
	/**
	 * Whether to use entries flagged `fuzzy` — machine-merged guesses awaiting
	 * review. Default `false`, which is how gettext itself treats them.
	 */
	readonly fuzzy?: boolean;
};

/**
 * Indexes parsed PO entries into a catalogue.
 *
 * The header entry supplies the locale and the plural rule. Obsolete entries,
 * untranslated ones, and (by default) fuzzy ones are left out, so a lookup that
 * misses falls through to the next catalogue in a chain instead of returning an
 * empty string.
 *
 * @throws {PluralFormsSyntaxError} When the header's `Plural-Forms` is present
 *   but unparseable — a silent fallback there would mistranslate every plural
 *   in the catalogue without a trace.
 */
export function messageCatalogueFromPo(
	entries: readonly PoEntry[],
	options?: PoCatalogueOptions,
): MessageCatalogue {
	const header = parsePoHeader(entries);
	const pluralForms = header.get("plural-forms");

	const messages = new Map<string, readonly string[]>();
	for (const entry of entries) {
		if (entry.obsolete || entry.id === "") {
			continue;
		}
		if (!(options?.fuzzy ?? false) && entry.flags.includes("fuzzy")) {
			continue;
		}
		if (entry.strings.every((text) => text === "")) {
			continue;
		}
		messages.set(messageKey(entry.id, entry.context), entry.strings);
	}

	return createMessageCatalogue({
		locale: options?.locale ?? header.get("language") ?? UNDETERMINED_,
		messages,
		plural:
			pluralForms === undefined
				? DEFAULT_PLURAL_FORMS
				: parsePluralForms(pluralForms),
	});
}
