import { describe, expect, it } from "vitest";

import { createIniEdits, editIni } from "./edit.js";
import { parseIniDocument } from "./parse-ini-document.js";
import { parseIni } from "./parse.js";
import { printIniDocument } from "./print-ini-document.js";
import { printIni } from "./print.js";

const CORPUS = `; a leading comment
# and the other marker

[server]
host = example.com
port = 8080

[server]
port = 9090

[client]
name = "  padded  "
flag
path = /a/b#c
`;

describe("parseIniDocument / printIniDocument", () => {
	it("round-trips byte for byte", () => {
		expect(printIniDocument(parseIniDocument(CORPUS))).toBe(CORPUS);
	});

	it("round-trips CRLF input, keeping the terminator a print option", () => {
		const crlf = CORPUS.replaceAll("\n", "\r\n");
		expect(printIniDocument(parseIniDocument(crlf), { newline: "\r\n" })).toBe(
			crlf,
		);
	});

	it("round-trips a file with no trailing newline", () => {
		const source = "[a]\nb = 1";
		expect(printIniDocument(parseIniDocument(source))).toBe(source);
	});

	it("keeps repeated sections distinct and in order", () => {
		const sections = parseIniDocument(CORPUS)
			.nodes.filter((node) => node.kind === "section")
			.map((node) => node.name);
		expect(sections).toStrictEqual(["server", "server", "client"]);
	});

	it("keeps comments as their own nodes", () => {
		const comments = parseIniDocument(CORPUS).nodes.filter(
			(node) => node.kind === "comment",
		);
		expect(comments).toHaveLength(2);
	});

	it("does not treat `#` inside a value as a comment by default", () => {
		expect(parseIni("path = /a/b#c")).toStrictEqual({ path: "/a/b#c" });
	});

	it("splits an inline comment when the dialect asks for it", () => {
		expect(
			parseIni("path = /a/b # note", { inlineComments: true }),
		).toStrictEqual({ path: "/a/b" });
	});
});

describe("parseIni", () => {
	it("projects sections onto nested objects", () => {
		expect(parseIni(CORPUS)).toStrictEqual({
			server: { host: "example.com", port: "9090" },
			client: { name: "  padded  ", flag: true, path: "/a/b#c" },
		});
	});

	it("applies the duplicate-key policy", () => {
		const source = "[a]\nk = 1\nk = 2\n";
		expect(parseIni(source)).toStrictEqual({ a: { k: "2" } });
		expect(parseIni(source, { duplicateKeys: "first" })).toStrictEqual({
			a: { k: "1" },
		});
		expect(parseIni(source, { duplicateKeys: "array" })).toStrictEqual({
			a: { k: ["1", "2"] },
		});
	});

	it("keeps a dot literal unless asked to nest", () => {
		expect(parseIni("a.b = 1")).toStrictEqual({ "a.b": "1" });
		expect(parseIni("a.b = 1", { dottedKeys: true })).toStrictEqual({
			a: { b: "1" },
		});
	});
});

describe("printIni", () => {
	it("round-trips through parseIni", () => {
		const value = { top: "1", section: { key: "value" } };
		expect(parseIni(printIni(value))).toStrictEqual(value);
	});

	it("quotes a value that would not survive bare", () => {
		expect(printIni({ k: "  padded  " })).toBe('k = "  padded  "\n');
		expect(parseIni(printIni({ k: "  padded  " }))).toStrictEqual({
			k: "  padded  ",
		});
	});
});

describe("createIniEdits", () => {
	it("rewrites only the target line, keeping comments and order", () => {
		const edited = editIni(CORPUS, ["client", "name"], "changed");

		expect(edited).toContain("; a leading comment");
		expect(edited).toContain("# and the other marker");
		expect(edited).toContain("name = changed");
		expect(edited).not.toContain('"  padded  "');
		// Everything else is untouched, including the duplicate section.
		expect(
			edited.split("\n").filter((line) => line === "[server]"),
		).toHaveLength(2);
	});

	it("produces a single narrow edit rather than a full-source replace", () => {
		const [edit] = createIniEdits(CORPUS, ["server", "host"], "other");
		expect(edit).toBeDefined();
		expect(edit!.length).toBeLessThan(CORPUS.length);
	});

	it("appends a key that is missing from an existing section", () => {
		const edited = editIni(CORPUS, ["client", "added"], "yes");
		expect(parseIni(edited)).toMatchObject({
			client: { added: "yes", name: "  padded  " },
		});
	});

	it("appends a whole section that does not exist yet", () => {
		const edited = editIni(CORPUS, ["fresh", "k"], "v");
		expect(parseIni(edited)).toMatchObject({ fresh: { k: "v" } });
	});
});
