import { describe, expect, it } from "vitest";

import { dedent, dedentLines } from "./dedent.js";

describe("dedentLines", () => {
	it("removes the indentation shared by every non-blank line", () => {
		expect(dedentLines("\t\tconst a = 1;\n\t\tconst b = 2;")).toStrictEqual([
			"const a = 1;",
			"const b = 2;",
		]);
	});

	it("keeps the relative indentation of deeper lines", () => {
		expect(dedentLines("  if (x) {\n    return 1;\n  }")).toStrictEqual([
			"if (x) {",
			"  return 1;",
			"}",
		]);
	});

	it("ignores blank lines when measuring, and empties them", () => {
		expect(dedentLines("    a\n   \n    b")).toStrictEqual(["a", "", "b"]);
	});

	it("is not defeated by a trailing newline", () => {
		expect(dedentLines("    a\n    b\n")).toStrictEqual(["a", "b", ""]);
	});

	it("does nothing when a line is already at column zero", () => {
		expect(dedentLines("a\n    b")).toStrictEqual(["a", "    b"]);
	});

	it("stops at the first character that differs, never mixing tabs with spaces", () => {
		expect(dedentLines("\ta\n  b")).toStrictEqual(["\ta", "  b"]);
	});

	it("accepts lines as an array and resplits them", () => {
		expect(dedentLines(["  a\n  b", "  c"])).toStrictEqual(["a", "b", "c"]);
	});

	it("handles text with no content at all", () => {
		expect(dedentLines("")).toStrictEqual([""]);
		expect(dedentLines("   \n  ")).toStrictEqual(["", ""]);
	});

	it("accepts CRLF line endings", () => {
		expect(dedentLines("  a\r\n  b")).toStrictEqual(["a", "b"]);
	});
});

describe("dedent", () => {
	it("rejoins the dedented lines", () => {
		expect(dedent("    a\n      b")).toBe("a\n  b");
	});
});
