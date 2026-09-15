import { describe, expect, it } from "vitest";

import { parseEditorConfig } from "./parse-editorconfig.js";
import { resolveEditorConfig } from "./resolve-editorconfig.js";
import {
	applyEditorConfigStyle,
	detectEditorConfigStyle,
} from "./text-style.js";

const ROOT_CONFIG = `root = true

[*]
end_of_line = lf
insert_final_newline = true
charset = utf-8

[*.{js,ts}]
indent_style = space
indent_size = 2

[Makefile]
indent_style = tab

[*.md]
trim_trailing_whitespace = false
custom_thing = yes
`;

function sources(directory = "/repo") {
	return [{ directory, file: parseEditorConfig(ROOT_CONFIG) }];
}

describe("parseEditorConfig", () => {
	it("reads the root flag from the preamble", () => {
		expect(parseEditorConfig(ROOT_CONFIG).root).toBe(true);
		expect(parseEditorConfig("[*]\nindent_size = 2\n").root).toBe(false);
	});

	it("keeps sections in source order", () => {
		expect(
			parseEditorConfig(ROOT_CONFIG).sections.map((s) => s.pattern),
		).toStrictEqual(["*", "*.{js,ts}", "Makefile", "*.md"]);
	});

	it("preserves a property the spec does not define", () => {
		const md = parseEditorConfig(ROOT_CONFIG).sections.at(-1);
		expect(md?.properties.unknown).toStrictEqual({ custom_thing: "yes" });
	});

	it("treats `unset` as saying nothing", () => {
		const file = parseEditorConfig("[*]\nindent_size = unset\n");
		expect(file.sections[0]?.properties.indentSize).toBeUndefined();
	});

	it("lower-cases property names and values", () => {
		const file = parseEditorConfig("[*]\nEnd_Of_Line = CRLF\n");
		expect(file.sections[0]?.properties.endOfLine).toBe("crlf");
	});
});

describe("resolveEditorConfig", () => {
	it("merges every matching section, later winning", () => {
		expect(resolveEditorConfig(sources(), "/repo/src/main.ts")).toMatchObject({
			endOfLine: "lf",
			insertFinalNewline: true,
			charset: "utf-8",
			indentStyle: "space",
			indentSize: 2,
		});
	});

	it("matches a pattern with no slash at any depth", () => {
		expect(
			resolveEditorConfig(sources(), "/repo/a/b/c/Makefile"),
		).toMatchObject({ indentStyle: "tab" });
	});

	it("does not apply a section whose glob does not match", () => {
		const resolved = resolveEditorConfig(sources(), "/repo/notes.md");
		expect(resolved.indentStyle).toBeUndefined();
		expect(resolved.trimTrailingWhitespace).toBe(false);
	});

	it("lets a nearer file override a further one", () => {
		const nested = [
			{ directory: "/repo", file: parseEditorConfig(ROOT_CONFIG) },
			{
				directory: "/repo/vendor",
				file: parseEditorConfig("[*.ts]\nindent_size = 8\n"),
			},
		];
		expect(resolveEditorConfig(nested, "/repo/vendor/x.ts")).toMatchObject({
			indentSize: 8,
		});
		expect(resolveEditorConfig(nested, "/repo/src/x.ts")).toMatchObject({
			indentSize: 2,
		});
	});

	it("cross-fills indent_size and tab_width", () => {
		const file = parseEditorConfig("[*]\nindent_size = 4\n");
		expect(
			resolveEditorConfig([{ directory: "/r", file }], "/r/a.txt"),
		).toMatchObject({ indentSize: 4, tabWidth: 4 });

		const tabbed = parseEditorConfig("[*]\nindent_size = tab\ntab_width = 8\n");
		expect(
			resolveEditorConfig([{ directory: "/r", file: tabbed }], "/r/a.txt"),
		).toMatchObject({ indentSize: 8 });
	});
});

describe("detectEditorConfigStyle", () => {
	it("reports a single line-ending kind and leaves mixed unset", () => {
		expect(detectEditorConfigStyle("a\nb\n").endOfLine).toBe("lf");
		expect(detectEditorConfigStyle("a\r\nb\r\n").endOfLine).toBe("crlf");
		expect(detectEditorConfigStyle("a\nb\r\n").endOfLine).toBeUndefined();
	});

	it("reports indentation style and width", () => {
		expect(detectEditorConfigStyle("a\n  b\n")).toMatchObject({
			indentStyle: "space",
			indentSize: 2,
		});
		expect(detectEditorConfigStyle("a\n\tb\n")).toMatchObject({
			indentStyle: "tab",
		});
	});

	it("reports trailing whitespace as the property that would keep it clean", () => {
		expect(detectEditorConfigStyle("a\n").trimTrailingWhitespace).toBe(true);
		expect(detectEditorConfigStyle("a  \nb\n").trimTrailingWhitespace).toBe(
			false,
		);
	});
});

describe("applyEditorConfigStyle", () => {
	it("normalizes line endings", () => {
		expect(applyEditorConfigStyle("a\nb\n", { endOfLine: "crlf" })).toBe(
			"a\r\nb\r\n",
		);
	});

	it("adds and removes a final newline", () => {
		expect(applyEditorConfigStyle("a", { insertFinalNewline: true })).toBe(
			"a\n",
		);
		expect(applyEditorConfigStyle("a\n", { insertFinalNewline: false })).toBe(
			"a",
		);
	});

	it("trims trailing whitespace on every line", () => {
		expect(
			applyEditorConfigStyle("a  \nb\t\n", { trimTrailingWhitespace: true }),
		).toBe("a\nb\n");
	});

	it("leaves a property alone when it is not set", () => {
		expect(applyEditorConfigStyle("a  \r\n", {})).toBe("a  \r\n");
	});

	it("round-trips against what it detected", () => {
		const text = "a  \r\nb";
		const applied = applyEditorConfigStyle(text, {
			endOfLine: "lf",
			insertFinalNewline: true,
			trimTrailingWhitespace: true,
		});
		expect(applied).toBe("a\nb\n");
		expect(detectEditorConfigStyle(applied)).toMatchObject({
			endOfLine: "lf",
			insertFinalNewline: true,
			trimTrailingWhitespace: true,
		});
	});
});
