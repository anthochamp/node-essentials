import { parsePo } from "@ac-kit/format-po";
import { expect, suite, test } from "vitest";

import { createMessageCatalogue, messageKey } from "./message-catalogue.js";
import { messageCatalogueFromPo } from "./po-catalogue.js";
import { createTranslator } from "./translator.js";

const FRENCH = `msgid ""
msgstr ""
"Language: fr\\n"
"Plural-Forms: nplurals=2; plural=(n > 1);\\n"

msgid "Open"
msgstr "Ouvrir"

msgctxt "verb"
msgid "Open"
msgstr "Ouvrez"

msgid "One file"
msgid_plural "%d files"
msgstr[0] "Un fichier"
msgstr[1] "%d fichiers"

#, fuzzy
msgid "Guessed"
msgstr "Devine"

msgid "Untranslated"
msgstr ""

#~ msgid "Dropped"
#~ msgstr "Supprime"
`;

const CANADIAN = `msgid ""
msgstr ""
"Language: fr-CA\\n"

msgid "Open"
msgstr "Ouvrir (CA)"
`;

const french = () => messageCatalogueFromPo(parsePo(FRENCH));
const canadian = () => messageCatalogueFromPo(parsePo(CANADIAN));

suite("messageKey", () => {
	test("returns the bare id when there is no context", () => {
		expect(messageKey("Open")).toBe("Open");
		expect(messageKey("Open", null)).toBe("Open");
	});

	test("joins a context with gettext's own separator", () => {
		expect(messageKey("Open", "verb")).toBe("verb\u0004Open");
	});
});

suite("messageCatalogueFromPo", () => {
	test("takes the locale from the header", () => {
		expect(french().locale).toBe("fr");
	});

	test("falls back to the undetermined tag when the header names none", () => {
		expect(
			messageCatalogueFromPo(parsePo('msgid "a"\nmsgstr "b"\n')).locale,
		).toBe("und");
	});

	test("honours an explicit locale over the header", () => {
		expect(
			messageCatalogueFromPo(parsePo(FRENCH), { locale: "fr-BE" }).locale,
		).toBe("fr-BE");
	});

	test("indexes a message and its context-qualified sibling apart", () => {
		const catalogue = french();
		expect(catalogue.getMessage("Open")).toBe("Ouvrir");
		expect(catalogue.getMessage("Open", { context: "verb" })).toBe("Ouvrez");
	});

	test("applies the header's plural rule, where zero is singular", () => {
		const catalogue = french();
		expect(catalogue.getPluralMessage("One file", 0)).toBe("Un fichier");
		expect(catalogue.getPluralMessage("One file", 1)).toBe("Un fichier");
		expect(catalogue.getPluralMessage("One file", 2)).toBe("%d fichiers");
	});

	test("leaves out obsolete, untranslated and fuzzy entries", () => {
		const catalogue = french();
		expect(catalogue.getMessage("Dropped")).toBeNull();
		expect(catalogue.getMessage("Untranslated")).toBeNull();
		expect(catalogue.getMessage("Guessed")).toBeNull();
	});

	test("includes fuzzy entries when asked", () => {
		expect(
			messageCatalogueFromPo(parsePo(FRENCH), { fuzzy: true }).getMessage(
				"Guessed",
			),
		).toBe("Devine");
	});

	test("rejects a header whose plural rule does not parse", () => {
		const broken =
			'msgid ""\nmsgstr "Plural-Forms: nplurals=2; plural=(n;\\n"\n';
		expect(() => messageCatalogueFromPo(parsePo(broken))).toThrow(SyntaxError);
	});
});

suite("createMessageCatalogue", () => {
	test("assumes the English rule when none is given", () => {
		const catalogue = createMessageCatalogue({
			locale: "en",
			messages: new Map([["file", ["one file", "many files"]]]),
		});
		expect(catalogue.getPluralMessage("file", 1)).toBe("one file");
		expect(catalogue.getPluralMessage("file", 0)).toBe("many files");
	});

	test("uses the last form when a half-finished entry has too few", () => {
		const catalogue = createMessageCatalogue({
			locale: "en",
			messages: new Map([["file", ["one file"]]]),
		});
		expect(catalogue.getPluralMessage("file", 5)).toBe("one file");
	});

	test("answers null for a message it does not carry", () => {
		const catalogue = createMessageCatalogue({
			locale: "en",
			messages: new Map(),
		});
		expect(catalogue.getMessage("missing")).toBeNull();
		expect(catalogue.getPluralMessage("missing", 2)).toBeNull();
	});
});

suite("createTranslator", () => {
	test("chains a region catalogue in front of its language", () => {
		const translator = createTranslator({
			catalogues: [french(), canadian()],
			locales: ["fr-CA"],
		});
		expect(translator.locales).toEqual(["fr-CA", "fr"]);
		expect(translator.getMessage("Open")).toBe("Ouvrir (CA)");
		expect(translator.getMessage("Open", { context: "verb" })).toBe("Ouvrez");
	});

	test("honours the order of the requested locales", () => {
		const translator = createTranslator({
			catalogues: [french(), canadian()],
			locales: ["fr", "fr-CA"],
		});
		expect(translator.locales).toEqual(["fr", "fr-CA"]);
		expect(translator.getMessage("Open")).toBe("Ouvrir");
	});

	test("falls back to the source text when nothing carries the message", () => {
		const translator = createTranslator({
			catalogues: [french()],
			locales: ["fr"],
		});
		expect(translator.getMessage("Unknown")).toBe("Unknown");
		expect(translator.getPluralMessage("%d cat", "%d cats", 1)).toBe("%d cat");
		expect(translator.getPluralMessage("%d cat", "%d cats", 3)).toBe("%d cats");
	});

	test("skips a range that matches no catalogue", () => {
		const translator = createTranslator({
			catalogues: [french()],
			locales: ["ja", "fr"],
		});
		expect(translator.locales).toEqual(["fr"]);
	});

	test("selects nothing when no range matches", () => {
		const translator = createTranslator({
			catalogues: [french()],
			locales: ["ja"],
		});
		expect(translator.locales).toEqual([]);
		expect(translator.getMessage("Open")).toBe("Open");
	});

	test("ignores a wildcard rather than matching everything", () => {
		expect(
			createTranslator({ catalogues: [french()], locales: ["*"] }).locales,
		).toEqual([]);
	});

	test("matches a catalogue locale case-insensitively", () => {
		const translator = createTranslator({
			catalogues: [messageCatalogueFromPo(parsePo(FRENCH), { locale: "FR" })],
			locales: ["fr"],
		});
		expect(translator.getMessage("Open")).toBe("Ouvrir");
	});
});
