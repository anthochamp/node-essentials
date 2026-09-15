import { EOT_CHAR } from "@ac-kit/core";
import { DEFAULT_PLURAL_FORMS, type PluralForms } from "@ac-kit/format-po";

/**
 * One locale's translations.
 *
 * A catalogue answers `null` for anything it does not carry, rather than
 * falling back to the source text itself: that is what lets several catalogues
 * be chained by a {@link Translator}, which owns the decision of what to show
 * when every one of them comes up empty.
 */
export type MessageCatalogue = {
	/** The language tag the catalogue was authored for. */
	readonly locale: string;
	/** The translation of `id`, or `null` when this catalogue lacks it. */
	getMessage(id: string, options?: MessageOptions): string | null;
	/**
	 * The translation of `id` for `count`, or `null` when this catalogue lacks
	 * it. Which form applies is the catalogue's own rule, not the caller's.
	 */
	getPluralMessage(
		id: string,
		count: number,
		options?: MessageOptions,
	): string | null;
};

export type MessageOptions = {
	/**
	 * Disambiguates two messages that share an id — gettext's `msgctxt`. A menu
	 * entry and a verb can both be spelled `Open` and still need different
	 * translations.
	 */
	readonly context?: string | null;
};

export type MessageCatalogueInput = {
	readonly locale: string;
	/**
	 * Translations keyed by {@link messageKey}, each holding one string per plural
	 * form — a single-element array for a message with no plural.
	 */
	readonly messages: ReadonlyMap<string, readonly string[]>;
	/**
	 * The locale's plural rule. Defaults to the two-form English rule, which is
	 * what gettext assumes when a catalogue declares none.
	 */
	readonly plural?: PluralForms | null;
};

/**
 * The key a context and an id combine into.
 *
 * Uses gettext's own separator, so a catalogue read from a PO or MO file keys
 * the same way one built in code does.
 */
export function messageKey(id: string, context?: string | null): string {
	return context === undefined || context === null
		? id
		: `${context}${EOT_CHAR}${id}`;
}

/** Builds a catalogue over an already-indexed set of translations. */
export function createMessageCatalogue(
	input: MessageCatalogueInput,
): MessageCatalogue {
	const { locale, messages } = input;
	const plural = input.plural ?? DEFAULT_PLURAL_FORMS;

	return {
		locale,

		getMessage(id, options) {
			return messages.get(messageKey(id, options?.context))?.[0] ?? null;
		},

		getPluralMessage(id, count, options) {
			const forms = messages.get(messageKey(id, options?.context));
			if (forms === undefined) {
				return null;
			}
			// A catalogue may carry fewer forms than its rule selects when a
			// translation is half-finished; the last one is closer than nothing.
			return forms[plural.select(count)] ?? forms[forms.length - 1] ?? null;
		},
	};
}
