import { expect, suite, test } from "vitest";

import {
	filterLanguageTags,
	isLanguageTagMatch,
	languageTagPrefixes,
	lookupLanguageTag,
} from "./match-language.js";

suite("languageTagPrefixes", () => {
	test("truncates one subtag at a time, longest first", () => {
		expect(languageTagPrefixes("zh-Hant-CN")).toEqual([
			"zh-Hant-CN",
			"zh-Hant",
			"zh",
		]);
	});

	test("skips a truncation that would end in a singleton", () => {
		expect(languageTagPrefixes("en-Latn-US-u-co-phonebk")).toEqual([
			"en-Latn-US-u-co-phonebk",
			"en-Latn-US-u-co",
			"en-Latn-US",
			"en-Latn",
			"en",
		]);
	});

	test("yields a single-subtag tag unchanged", () => {
		expect(languageTagPrefixes("en")).toEqual(["en"]);
	});
});

suite("isLanguageTagMatch", () => {
	test("basic matching extends the range whole subtags at a time", () => {
		expect(isLanguageTagMatch("en-US", "en")).toBe(true);
		expect(isLanguageTagMatch("EN-us", "en")).toBe(true);
		expect(isLanguageTagMatch("en-US", "en-US")).toBe(true);
		expect(isLanguageTagMatch("en-US", "*")).toBe(true);
	});

	test("basic matching does not skip an intervening subtag", () => {
		expect(isLanguageTagMatch("en-Latn-US", "en-US")).toBe(false);
	});

	test("basic matching does not match a partial subtag", () => {
		expect(isLanguageTagMatch("english", "en")).toBe(false);
	});

	test("extended matching skips intervening subtags", () => {
		const extended = { scheme: "extended" } as const;
		expect(isLanguageTagMatch("en-Latn-US", "en-US", extended)).toBe(true);
		expect(isLanguageTagMatch("en-Latn-GB", "en-US", extended)).toBe(false);
	});

	test("extended matching honours a wildcard in any position", () => {
		const extended = { scheme: "extended" } as const;
		expect(isLanguageTagMatch("de-DE", "*-DE", extended)).toBe(true);
		expect(isLanguageTagMatch("de-Latn-DE-1996", "de-*-DE", extended)).toBe(
			true,
		);
	});

	test("extended matching refuses to skip past a singleton", () => {
		expect(
			isLanguageTagMatch("en-a-bbb-US", "en-US", { scheme: "extended" }),
		).toBe(false);
	});
});

suite("filterLanguageTags", () => {
	const AVAILABLE = ["de", "de-CH", "de-DE", "en", "en-GB", "en-Latn-US"];

	test("returns every tag a range covers, in the order given", () => {
		expect(filterLanguageTags(AVAILABLE, ["de"])).toEqual([
			"de",
			"de-CH",
			"de-DE",
		]);
	});

	test("orders by range priority and never repeats a tag", () => {
		expect(filterLanguageTags(AVAILABLE, ["en-GB", "de-CH", "en"])).toEqual([
			"en-GB",
			"de-CH",
			"en",
			"en-Latn-US",
		]);
	});

	test("matches everything for the wildcard range", () => {
		expect(filterLanguageTags(AVAILABLE, ["*"])).toEqual(AVAILABLE);
	});

	test("extended filtering finds tags basic filtering misses", () => {
		expect(filterLanguageTags(AVAILABLE, ["en-US"])).toEqual([]);
		expect(
			filterLanguageTags(AVAILABLE, ["en-US"], { scheme: "extended" }),
		).toEqual(["en-Latn-US"]);
	});

	test("returns nothing when no range matches", () => {
		expect(filterLanguageTags(AVAILABLE, ["fr", "ja"])).toEqual([]);
	});
});

suite("lookupLanguageTag", () => {
	const AVAILABLE = ["en", "en-GB", "fr", "zh-Hant"];

	test("prefers an exact match over a truncation", () => {
		expect(lookupLanguageTag(AVAILABLE, ["en-GB"])).toBe("en-GB");
	});

	test("truncates until something available remains", () => {
		expect(lookupLanguageTag(AVAILABLE, ["en-Latn-US"])).toBe("en");
		expect(lookupLanguageTag(AVAILABLE, ["zh-Hant-CN-x-private"])).toBe(
			"zh-Hant",
		);
	});

	test("honours the priority order of the ranges", () => {
		expect(lookupLanguageTag(AVAILABLE, ["de", "fr", "en"])).toBe("fr");
	});

	test("compares case-insensitively and answers the caller's spelling", () => {
		expect(lookupLanguageTag(["EN-gb"], ["en-GB"])).toBe("EN-gb");
	});

	test("answers the default when nothing matches", () => {
		expect(lookupLanguageTag(AVAILABLE, ["ja"])).toBeNull();
		expect(lookupLanguageTag(AVAILABLE, ["ja"], { defaultTag: "en" })).toBe(
			"en",
		);
	});

	test("skips a wildcard-only range rather than matching anything", () => {
		expect(lookupLanguageTag(AVAILABLE, ["*"])).toBeNull();
		expect(lookupLanguageTag(AVAILABLE, ["*", "fr"])).toBe("fr");
	});

	test("ignores a wildcard subtag inside a range", () => {
		expect(lookupLanguageTag(AVAILABLE, ["zh-*-Hant"])).toBe("zh-Hant");
	});
});
