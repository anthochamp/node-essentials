import { expect, suite, test } from "vitest";

import { PoSyntaxError } from "./errors.js";
import { parsePo } from "./parse-po.js";
import { parsePoHeader } from "./po-header.js";
import { printPo } from "./print-po.js";

const CATALOGUE = `# Translator note
#. Shown on the login screen
#: src/login.ts:42 src/login.ts:99
#, fuzzy, c-format
#| msgid "Hello %s"
msgid "Hi %s"
msgstr "Salut %s"

msgid "One file"
msgid_plural "%d files"
msgstr[0] "Un fichier"
msgstr[1] "%d fichiers"

msgctxt "menu"
msgid "Open"
msgstr "Ouvrir"

#~ msgid "Dropped"
#~ msgstr "Supprimé"
`;

suite("parsePo", () => {
	test("reads every comment kind onto its own field", () => {
		const [entry] = parsePo(CATALOGUE);
		expect(entry).toMatchObject({
			translatorComments: ["Translator note"],
			extractedComments: ["Shown on the login screen"],
			references: [
				{ file: "src/login.ts", line: 42 },
				{ file: "src/login.ts", line: 99 },
			],
			flags: ["fuzzy", "c-format"],
			previous: { context: null, id: "Hello %s", idPlural: null },
			id: "Hi %s",
			strings: ["Salut %s"],
			obsolete: false,
		});
	});

	test("reads a plural entry into one string per form", () => {
		expect(parsePo(CATALOGUE)[1]).toMatchObject({
			id: "One file",
			idPlural: "%d files",
			strings: ["Un fichier", "%d fichiers"],
		});
	});

	test("reads msgctxt", () => {
		expect(parsePo(CATALOGUE)[2]).toMatchObject({
			context: "menu",
			id: "Open",
		});
	});

	test("marks a commented-out entry obsolete", () => {
		expect(parsePo(CATALOGUE)[3]).toMatchObject({
			id: "Dropped",
			strings: ["Supprimé"],
			obsolete: true,
		});
	});

	test("concatenates continuation lines", () => {
		const entries = parsePo('msgid ""\n"first\\n"\n"second\\n"\nmsgstr "x"\n');
		expect(entries[0]).toMatchObject({ id: "first\nsecond\n" });
	});

	test("concatenates adjacent strings on one line", () => {
		expect(parsePo('msgid "a" "b"\nmsgstr "c"\n')[0]).toMatchObject({
			id: "ab",
			strings: ["c"],
		});
	});

	test("decodes named, octal and hex escapes", () => {
		const entries = parsePo('msgid "tab\\there"\nmsgstr "\\101\\x42 \\q"\n');
		expect(entries[0]).toMatchObject({
			id: "tab\there",
			strings: ["AB q"],
		});
	});

	test("keeps a reference that names no line", () => {
		expect(parsePo('#: README\nmsgid "a"\nmsgstr "b"\n')[0]).toMatchObject({
			references: [{ file: "README", line: null }],
		});
	});

	test("reads a header entry", () => {
		const entries = parsePo('msgid ""\nmsgstr "Language: fr\\n"\n');
		expect(entries[0]).toMatchObject({ id: "", strings: ["Language: fr\n"] });
	});

	test("separates entries with no blank line between them", () => {
		expect(
			parsePo('msgid "a"\nmsgstr "1"\nmsgid "b"\nmsgstr "2"\n'),
		).toHaveLength(2);
	});

	test("rejects malformed input", () => {
		for (const source of [
			'msgid "unterminated\n',
			"msgid nothing\n",
			'"orphan continuation"\n',
			'msgstr "no id"\n',
			'msgid "a"\nmsgstr[2] "out of order"\n',
		]) {
			expect(() => parsePo(source)).toThrow(PoSyntaxError);
		}
	});
});

suite("printPo", () => {
	test("round-trips a catalogue through parse and print", () => {
		expect(printPo(parsePo(CATALOGUE))).toBe(CATALOGUE);
	});

	test("splits a multi-line value across continuation lines", () => {
		expect(
			printPo([
				{
					translatorComments: [],
					extractedComments: [],
					references: [],
					flags: [],
					previous: null,
					context: null,
					id: "first\nsecond\n",
					idPlural: null,
					strings: [""],
					obsolete: false,
				},
			]),
		).toBe('msgid ""\n"first\\n"\n"second\\n"\nmsgstr ""\n');
	});

	test("escapes a control character as octal", () => {
		expect(
			printPo([
				{
					translatorComments: [],
					extractedComments: [],
					references: [],
					flags: [],
					previous: null,
					context: null,
					id: "\u0001",
					idPlural: null,
					strings: [""],
					obsolete: false,
				},
			]),
		).toBe('msgid "\\001"\nmsgstr ""\n');
	});
});

suite("parsePoHeader", () => {
	test("splits the header block into case-folded fields", () => {
		const entries = parsePo(
			'msgid ""\nmsgstr ""\n"Language: fr\\n"\n"Plural-Forms: nplurals=2; plural=(n > 1);\\n"\n',
		);
		const header = parsePoHeader(entries);
		expect(header.get("language")).toBe("fr");
		expect(header.get("plural-forms")).toBe("nplurals=2; plural=(n > 1);");
	});

	test("answers an empty map when there is no header", () => {
		expect(parsePoHeader(parsePo('msgid "a"\nmsgstr "b"\n')).size).toBe(0);
	});
});
