/**
 * A BCP 47 (RFC 5646) language tag as a syntax tree.
 *
 * Case carries no meaning in a language tag — RFC 5646 §2.1.1 says so
 * explicitly — so parsing normalises it to the recommended form instead of
 * keeping what was authored. Printing is therefore canonicalising, unlike the
 * printers of formats where the authored spelling is part of the value.
 *
 * The tree describes _well-formedness_, the grammar of §2.1. _Validity_, the
 * further requirement that each subtag appear in the IANA registry, is a data
 * question this package does not answer: the registry is a versioned dataset
 * that would have to be shipped and kept current.
 */

/** One `singleton`-introduced extension sequence, such as `u-co-phonebk`. */
export type LanguageTagExtension = {
	/** A single character other than `x`, lowercased. */
	readonly singleton: string;
	/** At least one subtag of two to eight characters, lowercased. */
	readonly subtags: readonly string[];
};

export type LanguageTag =
	| {
			readonly kind: "langtag";
			/** Primary language subtag, lowercased — `en`, `sgn`, `zh`. */
			readonly language: string;
			/** Up to three extended language subtags — `yue` in `zh-yue`. */
			readonly extlangs: readonly string[];
			/** Four letters in title case — `Latn`. */
			readonly script: string | null;
			/** Two letters upper-cased or three digits — `US`, `419`. */
			readonly region: string | null;
			readonly variants: readonly string[];
			readonly extensions: readonly LanguageTagExtension[];
			/** Subtags following the `x` singleton, which is not repeated here. */
			readonly privateUse: readonly string[];
	  }
	/** A tag that is nothing but `x-…`, carrying no registered meaning at all. */
	| { readonly kind: "privateUse"; readonly subtags: readonly string[] }
	/**
	 * One of the seventeen irregular grandfathered tags, such as `i-klingon`.
	 * They predate the grammar and cannot be decomposed, so they stay whole.
	 */
	| { readonly kind: "irregular"; readonly text: string };

/**
 * The irregular grandfathered tags of RFC 5646 §2.1, in their registered
 * spelling, keyed by their lowercased form.
 *
 * The _regular_ grandfathered tags (`art-lojban`, `zh-min-nan`, …) are absent
 * because they parse as ordinary `langtag`s and need no special case.
 */
export const IRREGULAR_LANGUAGE_TAGS: ReadonlyMap<string, string> = new Map(
	[
		"en-GB-oed",
		"i-ami",
		"i-bnn",
		"i-default",
		"i-enochian",
		"i-hak",
		"i-klingon",
		"i-lux",
		"i-mingo",
		"i-navajo",
		"i-pwn",
		"i-tao",
		"i-tay",
		"i-tsu",
		"sgn-BE-FR",
		"sgn-BE-NL",
		"sgn-CH-DE",
	].map((tag) => [tag.toLowerCase(), tag]),
);
