import { expect, suite, test } from "vitest";

import { LanguageTagSyntaxError } from "./errors.js";
import {
	isWellFormedLanguageTag,
	parseLanguageTag,
	tryParseLanguageTag,
} from "./parse-language-tag.js";
import { printLanguageTag } from "./print-language-tag.js";

/** Parse then print, which is how a caller canonicalises a tag. */
function round_(text: string): string {
	return printLanguageTag(parseLanguageTag(text));
}

suite("parseLanguageTag", () => {
	test("reads a bare primary language subtag", () => {
		expect(parseLanguageTag("en")).toEqual({
			kind: "langtag",
			language: "en",
			extlangs: [],
			script: null,
			region: null,
			variants: [],
			extensions: [],
			privateUse: [],
		});
	});

	test("reads every positional subtag of a full tag", () => {
		expect(parseLanguageTag("zh-cmn-Hans-CN-boont-u-co-phonebk-x-lo")).toEqual({
			kind: "langtag",
			language: "zh",
			extlangs: ["cmn"],
			script: "Hans",
			region: "CN",
			variants: ["boont"],
			extensions: [{ singleton: "u", subtags: ["co", "phonebk"] }],
			privateUse: ["lo"],
		});
	});

	test("accepts up to three extended language subtags", () => {
		expect(parseLanguageTag("zh-min-nan")).toMatchObject({
			language: "zh",
			extlangs: ["min", "nan"],
		});
	});

	test("reads a numeric region and a digit-led variant", () => {
		expect(parseLanguageTag("es-419-1996")).toMatchObject({
			region: "419",
			variants: ["1996"],
		});
	});

	test("reads several extensions and several variants", () => {
		expect(parseLanguageTag("de-DE-1901-1996-u-co-phonebk-t-en")).toMatchObject(
			{
				variants: ["1901", "1996"],
				extensions: [
					{ singleton: "u", subtags: ["co", "phonebk"] },
					{ singleton: "t", subtags: ["en"] },
				],
			},
		);
	});

	test("reads a private-use-only tag", () => {
		expect(parseLanguageTag("x-whatever")).toEqual({
			kind: "privateUse",
			subtags: ["whatever"],
		});
	});

	test("keeps an irregular grandfathered tag whole", () => {
		expect(parseLanguageTag("I-Klingon")).toEqual({
			kind: "irregular",
			text: "i-klingon",
		});
		expect(parseLanguageTag("en-gb-oed")).toEqual({
			kind: "irregular",
			text: "en-GB-oed",
		});
	});

	test("parses a regular grandfathered tag as an ordinary langtag", () => {
		expect(parseLanguageTag("art-lojban")).toMatchObject({
			kind: "langtag",
			language: "art",
			variants: ["lojban"],
		});
	});

	test("normalises case rather than keeping what was authored", () => {
		expect(round_("EN-latn-us")).toBe("en-Latn-US");
		expect(round_("zH-HaNt-Hk")).toBe("zh-Hant-HK");
	});

	test("round-trips every shape of tag", () => {
		for (const tag of [
			"en",
			"en-US",
			"zh-Hant-HK",
			"zh-cmn-Hans-CN",
			"es-419",
			"sl-rozaj-biske",
			"de-DE-u-co-phonebk",
			"en-a-bbb-x-private",
			"x-whatever",
			"i-navajo",
		]) {
			expect(round_(tag)).toBe(tag);
		}
	});

	test("accepts a well-formed tag whose subtags are unregistered", () => {
		expect(isWellFormedLanguageTag("qq-Zxxx-QQ")).toBe(true);
	});

	test("rejects input that does not meet the grammar", () => {
		for (const tag of [
			"",
			"e",
			"toolongprimary",
			"en-",
			"en--US",
			"en-Latn-US-",
			"en-a",
			"x",
			"x-",
			"en-123456789",
		]) {
			expect(() => parseLanguageTag(tag)).toThrow(LanguageTagSyntaxError);
		}
	});

	test("rejects a repeated variant or extension singleton", () => {
		expect(() => parseLanguageTag("de-DE-1901-1901")).toThrow(
			LanguageTagSyntaxError,
		);
		expect(() => parseLanguageTag("de-DE-u-co-u-nu")).toThrow(
			LanguageTagSyntaxError,
		);
	});
});

suite("tryParseLanguageTag", () => {
	test("answers null instead of throwing on malformed input", () => {
		expect(tryParseLanguageTag("en-")).toBeNull();
		expect(tryParseLanguageTag("en-US")).toMatchObject({ region: "US" });
	});
});
