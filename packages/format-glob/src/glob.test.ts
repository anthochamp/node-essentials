import { describe, expect, it } from "vitest";

import { compileGlob, matchGlob } from "./compile-glob.js";
import { parseGlob } from "./parse-glob.js";
import { printGlob } from "./print-glob.js";

describe("matchGlob", () => {
	it("matches a literal path", () => {
		expect(matchGlob("a/b.ts", "a/b.ts")).toBe(true);
		expect(matchGlob("a/c.ts", "a/b.ts")).toBe(false);
	});

	it("stops `*` at a separator", () => {
		expect(matchGlob("a.ts", "*.ts")).toBe(true);
		expect(matchGlob("src/a.ts", "*.ts")).toBe(false);
	});

	it("spans separators with `**` where the dialect allows it", () => {
		expect(matchGlob("src/deep/a.ts", "**/a.ts", "editorconfig")).toBe(true);
	});

	it("matches exactly one character with `?`", () => {
		expect(matchGlob("ab", "a?")).toBe(true);
		expect(matchGlob("abc", "a?")).toBe(false);
	});

	it("matches a character class and its negation", () => {
		expect(matchGlob("b", "[abc]")).toBe(true);
		expect(matchGlob("d", "[abc]")).toBe(false);
		expect(matchGlob("d", "[!abc]")).toBe(true);
	});

	it("matches a class span", () => {
		expect(matchGlob("m", "[a-z]")).toBe(true);
		expect(matchGlob("M", "[a-z]")).toBe(false);
	});
});

describe("dialects", () => {
	it("expands braces under editorconfig but not under gitignore", () => {
		expect(matchGlob("a.ts", "a.{ts,tsx}", "editorconfig")).toBe(true);
		expect(matchGlob("a.ts", "a.{ts,tsx}", "gitignore")).toBe(false);
	});

	it("matches an unsupported construct literally rather than throwing", () => {
		expect(matchGlob("a.{ts,tsx}", "a.{ts,tsx}", "gitignore")).toBe(true);
	});

	it("has no globstar under posix, where `**` is two stars", () => {
		expect(matchGlob("src/deep/a.ts", "**/a.ts", "posix")).toBe(false);
		expect(matchGlob("src/a.ts", "**/a.ts", "posix")).toBe(true);
	});

	it("hides dot-files from wildcards under posix only", () => {
		expect(matchGlob(".env", "*", "posix")).toBe(false);
		expect(matchGlob(".env", "*", "editorconfig")).toBe(true);
		expect(matchGlob(".env", ".*", "posix")).toBe(true);
	});

	it("accepts `^` as a class negator only where the dialect says so", () => {
		expect(matchGlob("d", "[^abc]", "posix")).toBe(true);
		expect(matchGlob("^", "[^abc]", "editorconfig")).toBe(true);
	});

	it("anchors on a leading slash under gitignore only", () => {
		expect(matchGlob("a.ts", "/a.ts", "gitignore")).toBe(true);
		expect(matchGlob("src/a.ts", "/a.ts", "gitignore")).toBe(false);
	});

	it("honours a caller-supplied feature record", () => {
		const caseless = { ...parseGlobFeatures(), caseSensitive: false };
		expect(matchGlob("A.TS", "a.ts", caseless)).toBe(true);
	});
});

describe("numeric ranges", () => {
	it("matches inside the range and rejects outside it", () => {
		const matcher = compileGlob("v{1..9}.txt", "editorconfig");
		expect(matcher("v3.txt")).toBe(true);
		expect(matcher("v9.txt")).toBe(true);
		expect(matcher("v10.txt")).toBe(false);
	});

	it("handles negative bounds", () => {
		const matcher = compileGlob("{-2..2}", "editorconfig");
		expect(matcher("-1")).toBe(true);
		expect(matcher("-3")).toBe(false);
	});

	it("compiles a huge range without expanding it", () => {
		const matcher = compileGlob("{1..1000000}", "editorconfig");
		expect(matcher("999999")).toBe(true);
		expect(matcher("1000001")).toBe(false);
	});
});

describe("bounded input", () => {
	it("rejects brace nesting past the depth limit", () => {
		const deep = `${"{a,".repeat(12)}b${"}".repeat(12)}`;
		expect(() => parseGlob(deep, "editorconfig")).toThrow(/Brace nesting/);
	});

	it("rejects a chained-globstar pattern without exponential backtracking", () => {
		// Adjacent unbounded quantifiers are what blow up a naive glob-to-regex
		// translation: uncollapsed, this same pattern took minutes to reject.
		const matcher = compileGlob(`${"**/".repeat(40)}x`, "editorconfig");
		const started = Date.now();
		expect(matcher(`${"a/".repeat(200)}y`)).toBe(false);
		expect(Date.now() - started).toBeLessThan(1000);
	});

	it("still matches what a chained globstar should", () => {
		const matcher = compileGlob("**/**/x", "editorconfig");
		expect(matcher("x")).toBe(true);
		expect(matcher("a/b/x")).toBe(true);
		expect(matcher("a/b/y")).toBe(false);
	});
});

describe("printGlob", () => {
	it("round-trips the constructs the dialect defines", () => {
		for (const pattern of ["a/*.ts", "**/x?.js", "[a-z]*", "a.{ts,tsx}"]) {
			expect(printGlob(parseGlob(pattern, "editorconfig"))).toBe(pattern);
		}
	});

	it("escapes text that only parsed as literal", () => {
		expect(printGlob(parseGlob("a.{ts,tsx}", "gitignore"))).toBe(
			"a.\\{ts,tsx\\}",
		);
	});
});

function parseGlobFeatures() {
	return {
		starCrossesSeparator: false,
		globstar: true,
		singleChar: true,
		characterClass: true,
		classNegation: "!" as const,
		braceAlternation: true,
		braceRange: true,
		backslashEscape: true,
		leadingSlashAnchors: false,
		trailingSlashMeansDirectory: false,
		caseSensitive: true,
		periodMustBeExplicit: false,
	};
}
