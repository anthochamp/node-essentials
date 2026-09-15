/**
 * Matching a language tag against a language range, per RFC 4647.
 *
 * These operate on text rather than on the `LanguageTag` tree, because that is
 * what the RFC defines and what callers hold: an `Accept-Language` field value,
 * `navigator.languages`, a directory listing of catalogue files. Matching does
 * not require its inputs to be well-formed, and does not check that they are.
 *
 * Comparison is case-insensitive throughout; the strings handed back are the
 * caller's own, in the caller's own case.
 */

/** Which RFC 4647 filtering scheme `filterLanguageTags` applies. */
export type LanguageFilterScheme = "basic" | "extended";

export type LanguageMatchOptions = {
	/**
	 * Basic filtering (§3.3.1) matches a tag that equals the range or extends it
	 * one whole subtag at a time, so `en-US` does not match `en-Latn-US`.
	 * Extended filtering (§3.3.2) lets a tag interleave extra subtags, so it
	 * does, and additionally honours `*` in any position of the range.
	 *
	 * Default: `"basic"`.
	 */
	readonly scheme?: LanguageFilterScheme;
};

export type LanguageLookupOptions = {
	/** What to answer when no range matches anything available. Default `null`. */
	readonly defaultTag?: string | null;
};

/**
 * A language tag and each of its progressive truncations, longest first.
 *
 * `en-Latn-US-u-co-phonebk` yields `en-Latn-US-u-co`, then `en-Latn-US` —
 * skipping `en-Latn-US-u`, since RFC 4647 §3.4 discards a truncation that ends
 * in a singleton subtag — then `en-Latn` and `en`.
 *
 * Accepts any hyphen-separated subtag sequence, not only a well-formed tag,
 * because `lookupLanguageTag` truncates ranges with it.
 *
 * Runs in O(n²) characters for n subtags, which is bounded by the grammar.
 */
export function languageTagPrefixes(tag: string): string[] {
	const subtags = tag.split("-");
	const prefixes: string[] = [];

	for (let length = subtags.length; length > 0; length--) {
		if (subtags[length - 1]!.length === 1) {
			continue;
		}
		prefixes.push(subtags.slice(0, length).join("-"));
	}

	return prefixes;
}

/** Whether `range` matches `tag` under the chosen filtering scheme. */
export function isLanguageTagMatch(
	tag: string,
	range: string,
	options?: LanguageMatchOptions,
): boolean {
	const lowerTag = tag.toLowerCase();
	const lowerRange = range.toLowerCase();

	if (options?.scheme !== "extended") {
		return isBasicMatch_(lowerTag, lowerRange);
	}
	return isExtendedMatch_(lowerTag.split("-"), lowerRange.split("-"));
}

/**
 * Every available tag matched by at least one range, in RFC 4647 §3.3 order: by
 * range priority first, then by the order `available` yielded them.
 *
 * Runs in O(ranges × tags) subtag comparisons; both are small in practice.
 */
export function filterLanguageTags(
	available: Iterable<string>,
	ranges: Iterable<string>,
	options?: LanguageMatchOptions,
): string[] {
	const extended = options?.scheme === "extended";
	// Split once per tag rather than once per (tag, range) pair.
	const candidates = [...available].map((tag) => {
		const lower = tag.toLowerCase();
		return { tag, lower, subtags: extended ? lower.split("-") : [] };
	});

	const matched: string[] = [];
	const taken = new Set<string>();
	for (const range of ranges) {
		const lower = range.toLowerCase();
		const subtags = extended ? lower.split("-") : [];
		for (const candidate of candidates) {
			if (taken.has(candidate.tag)) {
				continue;
			}
			const matches = extended
				? isExtendedMatch_(candidate.subtags, subtags)
				: isBasicMatch_(candidate.lower, lower);
			if (matches) {
				taken.add(candidate.tag);
				matched.push(candidate.tag);
			}
		}
	}

	return matched;
}

/**
 * The single best available tag for a priority list of ranges, per RFC 4647
 * §3.4 Lookup.
 *
 * Each range is truncated a subtag at a time until one of the truncations is an
 * available tag; the first range to produce one wins. A `*` subtag carries no
 * information a truncation could use, so it is dropped, and a range of nothing
 * but `*` is skipped rather than treated as matching everything — a caller that
 * wants a fallback says so with `defaultTag`.
 *
 * Where two available tags differ only in case, the first one wins.
 */
export function lookupLanguageTag(
	available: Iterable<string>,
	ranges: Iterable<string>,
	options?: LanguageLookupOptions,
): string | null {
	const byLowerTag = new Map<string, string>();
	for (const tag of available) {
		const lower = tag.toLowerCase();
		if (!byLowerTag.has(lower)) {
			byLowerTag.set(lower, tag);
		}
	}

	for (const range of ranges) {
		const subtags = range
			.toLowerCase()
			.split("-")
			.filter((subtag) => subtag !== "*");
		if (subtags.length === 0) {
			continue;
		}

		for (const prefix of languageTagPrefixes(subtags.join("-"))) {
			const found = byLowerTag.get(prefix);
			if (found !== undefined) {
				return found;
			}
		}
	}

	return options?.defaultTag ?? null;
}

function isBasicMatch_(tag: string, range: string): boolean {
	if (range === "*") {
		return true;
	}
	return tag === range || tag.startsWith(`${range}-`);
}

function isExtendedMatch_(
	tag: readonly string[],
	range: readonly string[],
): boolean {
	const first = range[0];
	if (first !== "*" && first !== tag[0]) {
		return false;
	}

	let tagAt = 1;
	for (let rangeAt = 1; rangeAt < range.length; rangeAt++) {
		const subtag = range[rangeAt]!;
		if (subtag === "*") {
			continue;
		}

		let consumed = false;
		while (tagAt < tag.length) {
			const candidate = tag[tagAt]!;
			tagAt++;
			if (candidate === subtag) {
				consumed = true;
				break;
			}
			// A singleton opens an extension, so skipping past one would let a
			// range match subtags that belong to a different namespace.
			if (candidate.length === 1) {
				return false;
			}
		}
		if (!consumed) {
			return false;
		}
	}

	return true;
}
