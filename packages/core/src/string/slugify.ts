import { stripDiacritics } from "./strip-diacritics.js";

export type SlugifyOptions = {
	/** Joins the retained runs. Defaults to `"-"`. */
	separator?: string | null;
	/** Returned when no alphanumeric character survives. Defaults to `""`. */
	fallback?: string | null;
};

const NON_SLUG_RUN = /[^a-z0-9]+/;

/**
 * Lowercase ASCII slug of `input`: diacritics folded onto their base letters,
 * every other run of characters collapsed into `separator`, and no leading or
 * trailing separator.
 *
 * The result is safe both as a URL path segment and as a file name on every
 * platform, since only `a-z`, `0-9` and `separator` survive.
 *
 * Letters Unicode defines no decomposition for (`Æ`, `Ø`, `Ł`, and every
 * non-Latin script) have no ASCII base to fold onto and are dropped with the
 * rest — a name written entirely in such letters yields `fallback`.
 */
export function slugify(input: string, options?: SlugifyOptions): string {
	const parts = stripDiacritics(input)
		.toLowerCase()
		.split(NON_SLUG_RUN)
		.filter((part) => part !== "");

	if (parts.length === 0) {
		return options?.fallback ?? "";
	}

	return parts.join(options?.separator ?? "-");
}
