import { languageTagPrefixes } from "@ac-kit/format-language-tag";

import type { MessageCatalogue, MessageOptions } from "./message-catalogue.js";

/**
 * What an application holds: a negotiated chain of catalogues, and a lookup
 * that always answers.
 *
 * Where a {@link MessageCatalogue} answers `null` for a message it lacks, a
 * translator falls through to the next catalogue in the chain and finally to
 * the source text, so a call site never has to handle a miss.
 */
export type Translator = {
	/** The catalogue locales that were selected, most preferred first. */
	readonly locales: readonly string[];
	/** The translation of `id`, or `id` itself when nothing carries it. */
	getMessage(id: string, options?: MessageOptions): string;
	/**
	 * The translation of `id` for `count`, or the untranslated source text — `id`
	 * for one, `pluralId` otherwise, which is the English rule gettext applies
	 * when a message is missing.
	 */
	getPluralMessage(
		id: string,
		pluralId: string,
		count: number,
		options?: MessageOptions,
	): string;
};

export type TranslatorInput = {
	/** Every catalogue available, in no particular order. */
	readonly catalogues: Iterable<MessageCatalogue>;
	/**
	 * What the user asked for, most preferred first — an `Accept-Language` field,
	 * `navigator.languages`, or a single configured locale. These are RFC 4647
	 * language ranges, so `fr` selects a `fr-CA` catalogue too.
	 */
	readonly locales: Iterable<string>;
};

/**
 * Negotiates a catalogue chain and returns a lookup over it.
 *
 * Each requested range is truncated a subtag at a time (RFC 4647 §3.4), and
 * every catalogue matching along the way joins the chain in that order — so
 * asking for `fr-CA` consults the `fr-CA` catalogue, then `fr`, before giving
 * up. A range matching nothing is skipped rather than failing the whole
 * negotiation.
 *
 * Negotiation happens once, here. Each lookup is then O(chain length), which is
 * the number of locales that actually matched.
 */
export function createTranslator(input: TranslatorInput): Translator {
	const byLocale = new Map<string, MessageCatalogue>();
	for (const catalogue of input.catalogues) {
		const key = catalogue.locale.toLowerCase();
		if (!byLocale.has(key)) {
			byLocale.set(key, catalogue);
		}
	}

	const chain: MessageCatalogue[] = [];
	for (const range of input.locales) {
		const subtags = range
			.toLowerCase()
			.split("-")
			.filter((subtag) => subtag !== "*");
		if (subtags.length === 0) {
			continue;
		}

		for (const prefix of languageTagPrefixes(subtags.join("-"))) {
			const catalogue = byLocale.get(prefix);
			if (catalogue !== undefined && !chain.includes(catalogue)) {
				chain.push(catalogue);
			}
		}
	}

	return {
		locales: chain.map((catalogue) => catalogue.locale),

		getMessage(id, options) {
			for (const catalogue of chain) {
				const message = catalogue.getMessage(id, options);
				if (message !== null) {
					return message;
				}
			}
			return id;
		},

		getPluralMessage(id, pluralId, count, options) {
			for (const catalogue of chain) {
				const message = catalogue.getPluralMessage(id, count, options);
				if (message !== null) {
					return message;
				}
			}
			return count === 1 ? id : pluralId;
		},
	};
}
