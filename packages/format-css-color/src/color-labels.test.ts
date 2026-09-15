import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { parsePo, parsePoHeader } from "@ac-kit/format-po";
import { expect, suite, test } from "vitest";

import { cssColorLabel } from "./color-labels.js";
import { cssNamedColorNames } from "./named-colors.js";
import { CSS_COLOR_LABELS, LOCALE } from "./names/fr.js";

const FRENCH_PO = fileURLToPath(new URL("../locale/fr.po", import.meta.url));

suite("cssColorLabel", () => {
	test("returns the label for a keyword", () => {
		expect(cssColorLabel(CSS_COLOR_LABELS, "aliceblue")).toBe("Bleu Alice");
	});

	test("matches a keyword case-insensitively", () => {
		expect(cssColorLabel(CSS_COLOR_LABELS, "AliceBlue" as any)).toBe(
			"Bleu Alice",
		);
	});

	test("follows an alias to its canonical keyword", () => {
		expect(cssColorLabel(CSS_COLOR_LABELS, "aqua")).toBe(
			cssColorLabel(CSS_COLOR_LABELS, "cyan"),
		);
		expect(cssColorLabel(CSS_COLOR_LABELS, "grey")).toBe(
			cssColorLabel(CSS_COLOR_LABELS, "gray"),
		);
	});

	test("degrades to the keyword when the table has no entry", () => {
		expect(cssColorLabel(new Map(), "aliceblue")).toBe("aliceblue");
		expect(cssColorLabel(CSS_COLOR_LABELS, "notacolour" as any)).toBe(
			"notacolour",
		);
	});
});

suite("names/fr", () => {
	test("declares the locale its catalogue was written for", () => {
		expect(LOCALE).toBe("fr");
	});

	test("labels every keyword the spec defines", () => {
		const missing = [...cssNamedColorNames()].filter(
			(name) => !CSS_COLOR_LABELS.has(name as never),
		);
		expect(missing).toEqual([]);
	});

	test("is what the generator produces from the catalogue it was built from", async () => {
		const entries = parsePo(await readFile(FRENCH_PO, "utf8"));
		const expected = entries
			.filter((entry) => entry.id !== "" && !entry.obsolete)
			.map((entry) => [entry.id, entry.strings[0]]);

		expect([...CSS_COLOR_LABELS]).toEqual(expected);
		expect(parsePoHeader(entries).get("language")).toBe(LOCALE);
	});
});
