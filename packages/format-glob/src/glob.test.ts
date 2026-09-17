import { describe, expect, it } from "vitest";

import {
	compareGlobPathMatches,
	compileGlobPath,
	type GlobPathMatch,
	matchGlobPath,
} from "./compile-glob-path.js";
import { compileGlob, matchGlob } from "./compile-glob.js";
import { type GlobFeatures, globFeatures } from "./dialect.js";
import { GlobLimitExceededError } from "./limits.js";
import { parseGlob } from "./parse-glob.js";
import { printGlob } from "./print-glob.js";

function features(overrides: Partial<GlobFeatures> = {}): GlobFeatures {
	return { ...globFeatures("editorconfig"), ...overrides };
}

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
		expect(matchGlob("A.TS", "a.ts", features({ caseSensitive: false }))).toBe(
			true,
		);
	});

	it("leaves the bash-only constructs literal in the other presets", () => {
		for (const dialect of ["posix", "editorconfig", "gitignore"] as const) {
			expect(matchGlob("!a", "!a", dialect)).toBe(true);
			expect(matchGlob("#a", "#a", dialect)).toBe(true);
			expect(matchGlob("@(a|b)", "@(a|b)", dialect)).toBe(true);
			expect(matchGlob("[[:alpha:]]", "x", dialect)).toBe(false);
		}
	});
});

describe("extglob", () => {
	it("matches zero or one with `?(…)`", () => {
		const matcher = compileGlob("a?(b|c)d", "bash");
		expect(matcher("ad")).toBe(true);
		expect(matcher("abd")).toBe(true);
		expect(matcher("acd")).toBe(true);
		expect(matcher("abcd")).toBe(false);
	});

	it("matches exactly one with `@(…)`", () => {
		const matcher = compileGlob("a@(b|c)d", "bash");
		expect(matcher("abd")).toBe(true);
		expect(matcher("ad")).toBe(false);
	});

	it("matches zero or more with `*(…)`", () => {
		const matcher = compileGlob("a*(b|c)d", "bash");
		expect(matcher("ad")).toBe(true);
		expect(matcher("abcbd")).toBe(true);
		expect(matcher("aed")).toBe(false);
	});

	it("matches one or more with `+(…)`", () => {
		const matcher = compileGlob("a+(b|c)d", "bash");
		expect(matcher("ad")).toBe(false);
		expect(matcher("abd")).toBe(true);
		expect(matcher("abcbd")).toBe(true);
	});

	it("complements with `!(…)`", () => {
		const matcher = compileGlob("!(foo)", "bash");
		expect(matcher("foo")).toBe(false);
		expect(matcher("bar")).toBe(true);
		expect(matcher("foobar")).toBe(true);
		expect(matcher("")).toBe(true);
	});

	it("complements a whole alternation, not one branch", () => {
		const matcher = compileGlob("!(foo|bar)", "bash");
		expect(matcher("foo")).toBe(false);
		expect(matcher("bar")).toBe(false);
		expect(matcher("baz")).toBe(true);
	});

	it("complements a branch holding a wildcard", () => {
		const matcher = compileGlob("!(*.js)", "bash");
		expect(matcher("a.js")).toBe(false);
		expect(matcher("a.ts")).toBe(true);
		expect(matcher(".js")).toBe(false);
	});

	it("never lets a complement cross a separator", () => {
		const matcher = compileGlob("!(foo)", "bash");
		expect(matcher("a/b")).toBe(false);
	});

	it("takes the complement against the rest of the pattern", () => {
		// `!(b)` has to match `b` for `bc` to match, and it cannot.
		const matcher = compileGlob("!(b)c", "bash");
		expect(matcher("bc")).toBe(false);
		expect(matcher("ac")).toBe(true);
		expect(matcher("c")).toBe(true);
	});

	it("nests", () => {
		const matcher = compileGlob("!(a|@(b|c))", "bash");
		expect(matcher("a")).toBe(false);
		expect(matcher("b")).toBe(false);
		expect(matcher("c")).toBe(false);
		expect(matcher("d")).toBe(true);
	});

	it("nests a complement inside a complement", () => {
		const matcher = compileGlob("!(!(a))", "bash");
		expect(matcher("a")).toBe(true);
		expect(matcher("b")).toBe(false);
	});

	it("matches anything non-empty for an empty `!()`", () => {
		const matcher = compileGlob("!()", "bash");
		expect(matcher("")).toBe(false);
		expect(matcher("a")).toBe(true);
	});

	it("stays literal where the dialect has no extglob", () => {
		expect(matchGlob("@(a|b)", "@(a|b)", "editorconfig")).toBe(true);
		expect(matchGlob("a", "@(a|b)", "editorconfig")).toBe(false);
	});

	it("stays literal when the group never closes", () => {
		expect(matchGlob("@(a", "@(a", "bash")).toBe(true);
	});

	it("expands a numeric range inside an extglob body", () => {
		const matcher = compileGlob("!({1..3})", "bash");
		expect(matcher("2")).toBe(false);
		expect(matcher("4")).toBe(true);
	});
});

describe("pattern negation", () => {
	it("inverts the whole verdict", () => {
		expect(matchGlob("a.ts", "!*.ts", "bash")).toBe(false);
		expect(matchGlob("a.js", "!*.ts", "bash")).toBe(true);
	});

	it("toggles on repetition", () => {
		expect(matchGlob("a.ts", "!!*.ts", "bash")).toBe(true);
	});

	it("is escapable", () => {
		expect(matchGlob("!a", "\\!a", "bash")).toBe(true);
	});

	it("is distinct from a class negation", () => {
		expect(matchGlob("d", "[!abc]", "bash")).toBe(true);
		expect(matchGlob("a", "[!abc]", "bash")).toBe(false);
	});
});

describe("comments", () => {
	it("matches nothing", () => {
		const matcher = compileGlob("# a comment", "bash");
		expect(matcher("# a comment")).toBe(false);
		expect(matcher("")).toBe(false);
	});

	it("is escapable", () => {
		expect(matchGlob("#a", "\\#a", "bash")).toBe(true);
	});

	it("keeps its text for printing", () => {
		expect(parseGlob("#note", "bash").comment).toBe("note");
	});
});

describe("matchBase", () => {
	const dialect = features({ matchBase: true, globstar: true });

	it("matches the last segment for a separator-free pattern", () => {
		expect(matchGlob("src/deep/a.ts", "*.ts", dialect)).toBe(true);
		expect(matchGlob("a.ts", "*.ts", dialect)).toBe(true);
	});

	it("leaves a pattern holding a separator alone", () => {
		expect(matchGlob("src/deep/a.ts", "deep/*.ts", dialect)).toBe(false);
		expect(matchGlob("deep/a.ts", "deep/*.ts", dialect)).toBe(true);
	});
});

describe("POSIX classes", () => {
	it("matches the twelve names", () => {
		expect(matchGlob("g", "[[:alpha:]]", "bash")).toBe(true);
		expect(matchGlob("4", "[[:alpha:]]", "bash")).toBe(false);
		expect(matchGlob("4", "[[:digit:]]", "bash")).toBe(true);
		expect(matchGlob(" ", "[[:space:]]", "bash")).toBe(true);
		expect(matchGlob("G", "[[:upper:]]", "bash")).toBe(true);
		expect(matchGlob("g", "[[:lower:]]", "bash")).toBe(true);
		expect(matchGlob("g4", "[[:alnum:]][[:alnum:]]", "bash")).toBe(true);
		expect(matchGlob(";", "[[:punct:]]", "bash")).toBe(true);
		expect(matchGlob("f", "[[:xdigit:]]", "bash")).toBe(true);
		expect(matchGlob("g", "[[:xdigit:]]", "bash")).toBe(false);
		expect(matchGlob("\u0007", "[[:cntrl:]]", "bash")).toBe(true);
		expect(matchGlob("~", "[[:print:]]", "bash")).toBe(true);
		expect(matchGlob("~", "[[:graph:]]", "bash")).toBe(true);
		expect(matchGlob("\t", "[[:blank:]]", "bash")).toBe(true);
	});

	it("combines with ordinary members", () => {
		expect(matchGlob("_", "[[:alpha:]_]", "bash")).toBe(true);
	});

	it("leaves an unknown name as ordinary members", () => {
		// `[[:nope:]]` is a class of `[`, `:`, `n`, `o`, `p`, `e` and a literal `]`.
		expect(matchGlob(":]", "[[:nope:]]", "bash")).toBe(true);
		expect(matchGlob("n]", "[[:nope:]]", "bash")).toBe(true);
		expect(matchGlob("x]", "[[:nope:]]", "bash")).toBe(false);
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
		expect(() => parseGlob(deep, "editorconfig")).toThrow(
			GlobLimitExceededError,
		);
		expect(() => parseGlob(deep, "editorconfig")).toThrow(/Brace nesting/);
	});

	it("rejects a pattern longer than the bound", () => {
		expect(() =>
			parseGlob("a".repeat(20), "posix", { maxPatternLength: 8 }),
		).toThrow(/longer than 8/);
	});

	it("rejects a brace expansion product past the bound, not just its depth", () => {
		const wide = "{a,b}".repeat(8);
		expect(() => parseGlob(wide, "editorconfig")).not.toThrow();
		expect(() =>
			parseGlob(wide, "editorconfig", { maxBraceProduct: 16 }),
		).toThrow(/Brace expansion/);
	});

	it("rejects extglob nesting past the bound", () => {
		const deep = `${"@(".repeat(12)}a${")".repeat(12)}`;
		expect(() => parseGlob(deep, "bash")).toThrow(/Extglob nesting/);
	});

	it("rejects a complement whose determinisation outgrows the bound", () => {
		expect(() =>
			compileGlob("!(*a*b*c*d*e*f*g*h*i*j*)", "bash", {
				maxComplementStates: 32,
			}),
		).toThrow(/Complementing an extglob/);
	});

	it("rejects a numeric range inside an extglob past the bound", () => {
		expect(() =>
			compileGlob("!({1..5000})", "bash", { maxRangeExpansion: 100 }),
		).toThrow(/Numeric range/);
	});

	it("names the bound it hit", () => {
		try {
			parseGlob("a".repeat(20), "posix", { maxPatternLength: 8 });
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(GlobLimitExceededError);
			expect((error as GlobLimitExceededError).kind).toBe("patternLength");
			expect((error as GlobLimitExceededError).limit).toBe(8);
		}
	});

	it("rejects a chained-globstar pattern without exponential backtracking", () => {
		// Adjacent unbounded quantifiers are what blow up a naive glob-to-regex
		// translation: uncollapsed, this same pattern took minutes to reject.
		const matcher = compileGlob(`${"**/".repeat(40)}x`, "editorconfig");
		const started = Date.now();
		expect(matcher(`${"a/".repeat(200)}y`)).toBe(false);
		expect(Date.now() - started).toBeLessThan(1000);
	});

	it("rejects a nested extglob repetition without exponential backtracking", () => {
		// `*(*|a)` is `(?:[^/]*|a)*` — the shape a backtracking engine cannot
		// survive, and the reason this pattern goes to the Pike VM instead.
		const matcher = compileGlob("*(*|a)b", "bash");
		const started = Date.now();
		expect(matcher(`${"a".repeat(60)}c`)).toBe(false);
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

	it("round-trips the bash constructs", () => {
		for (const pattern of [
			"@(a|b)",
			"!(a|b)",
			"*(a|b)",
			"+(a|b)",
			"?(a|b)",
			"a/!(*.js)",
			"[[:alpha:]][[:digit:]]",
			"!*.ts",
			"#a comment",
		]) {
			expect(printGlob(parseGlob(pattern, "bash"))).toBe(pattern);
		}
	});

	it("escapes text that only parsed as literal", () => {
		expect(printGlob(parseGlob("a.{ts,tsx}", "gitignore"))).toBe(
			"a.\\{ts,tsx\\}",
		);
		expect(printGlob(parseGlob("@(a|b)", "editorconfig"))).toBe("@\\(a\\|b\\)");
	});

	it("escapes a leading `!` or `#` that was not a directive", () => {
		expect(printGlob(parseGlob("!a", "posix"))).toBe("\\!a");
		expect(printGlob(parseGlob("#a", "posix"))).toBe("\\#a");
	});

	it("prints an escaped form that means the same under bash", () => {
		for (const pattern of ["@(a|b)", "!a", "#a", "a(b)c"]) {
			const printed = printGlob(parseGlob(pattern, "editorconfig"));
			expect(matchGlob(pattern, printed, "bash")).toBe(true);
		}
	});
});

describe("compileGlobPath", () => {
	it("matches segment for segment", () => {
		expect(matchGlobPath(["a", "b"], ["a", "b"])).not.toBeNull();
		expect(matchGlobPath(["a", "c"], ["a", "b"])).toBeNull();
	});

	it("matches exactly one segment with `*`", () => {
		expect(matchGlobPath(["a", "b", "c"], ["a", "*", "c"])).not.toBeNull();
		expect(matchGlobPath(["a", "c"], ["a", "*", "c"])).toBeNull();
	});

	it("spans zero or more segments with `**`", () => {
		expect(matchGlobPath(["a", "c"], ["a", "**", "c"])).not.toBeNull();
		expect(
			matchGlobPath(["a", "x", "y", "c"], ["a", "**", "c"]),
		).not.toBeNull();
		expect(matchGlobPath([], ["**"])).not.toBeNull();
	});

	it("keeps a delimiter inside a segment literal", () => {
		// The whole reason the face takes segments: joining would make this a
		// two-segment path, and `a/b` a two-segment pattern.
		expect(matchGlobPath(["a/b"], ["a/b"])).not.toBeNull();
		expect(matchGlobPath(["a", "b"], ["a/b"])).toBeNull();
	});

	it("applies the dialect inside a segment", () => {
		expect(matchGlobPath(["a", "b.ts"], ["a", "*.ts"])).not.toBeNull();
		expect(matchGlobPath(["a", "b.js"], ["a", "*.ts"])).toBeNull();
		expect(
			matchGlobPath(["a", "b.ts"], ["a", "{b,c}.ts"], "editorconfig"),
		).not.toBeNull();
		expect(
			matchGlobPath(["a", "b.ts"], ["a", "{b,c}.ts"], "gitignore"),
		).toBeNull();
	});

	it("treats a sequence-item segment as literal text", () => {
		// `[]` means "array element" to a consumer; here it is two characters.
		expect(matchGlobPath(["a", "[]"], ["a", "[]"], "bash")).not.toBeNull();
		expect(matchGlobPath(["a", "x"], ["a", "[]"], "bash")).toBeNull();
	});

	it("reports the statistics a precedence ranking needs", () => {
		expect(
			matchGlobPath(["a", "x", "y", "b.ts"], ["a", "**", "*", "*.ts"]),
		).toEqual({
			wildcardSegments: 1,
			globstarSegments: 1,
			globSegments: 1,
			rightmostWildcard: false,
			patternLength: 4,
		} satisfies GlobPathMatch);
	});

	it("compiles once and matches many", () => {
		const matcher = compileGlobPath(["a", "**", "*.ts"]);
		expect(matcher(["a", "b", "c.ts"])).not.toBeNull();
		expect(matcher(["a", "c.ts"])).not.toBeNull();
		expect(matcher(["b", "c.ts"])).toBeNull();
	});

	it("matches a run of globstars without backtracking", () => {
		const matcher = compileGlobPath([
			...Array.from({ length: 20 }, () => "**"),
			"x",
		]);
		const started = Date.now();
		expect(matcher(Array.from({ length: 200 }, () => "a"))).toBeNull();
		expect(Date.now() - started).toBeLessThan(1000);
	});
});

describe("compareGlobPathMatches", () => {
	function rank(patterns: string[][], path: string[]): string[][] {
		return patterns
			.map((pattern) => ({ pattern, match: matchGlobPath(path, pattern) }))
			.filter(
				(entry): entry is { pattern: string[]; match: GlobPathMatch } =>
					entry.match !== null,
			)
			.sort((left, right) => compareGlobPathMatches(left.match, right.match))
			.map((entry) => entry.pattern);
	}

	it("ranks exact over glob over wildcard over globstar", () => {
		expect(
			rank(
				[
					["**", "dns"],
					["nets", "*", "dns"],
					["nets", "mgmt", "dns"],
					["nets", "mgmt", "d*"],
				],
				["nets", "mgmt", "dns"],
			),
		).toEqual([
			["nets", "mgmt", "dns"],
			["nets", "mgmt", "d*"],
			["nets", "*", "dns"],
			["**", "dns"],
		]);
	});

	it("prefers a rightmost single wildcard", () => {
		expect(
			rank(
				[
					["a", "*", "c"],
					["a", "b", "*"],
				],
				["a", "b", "c"],
			),
		).toEqual([
			["a", "b", "*"],
			["a", "*", "c"],
		]);
	});

	it("prefers fewer special segments, then a longer pattern", () => {
		expect(
			rank(
				[
					["*", "*", "*"],
					["a", "*", "*"],
				],
				["a", "b", "c"],
			),
		).toEqual([
			["a", "*", "*"],
			["*", "*", "*"],
		]);
	});

	it("is a strict weak ordering", () => {
		const samples: GlobPathMatch[] = [
			{
				wildcardSegments: 0,
				globstarSegments: 0,
				globSegments: 0,
				rightmostWildcard: false,
				patternLength: 3,
			},
			{
				wildcardSegments: 1,
				globstarSegments: 0,
				globSegments: 0,
				rightmostWildcard: true,
				patternLength: 3,
			},
			{
				wildcardSegments: 1,
				globstarSegments: 0,
				globSegments: 0,
				rightmostWildcard: false,
				patternLength: 3,
			},
			{
				wildcardSegments: 2,
				globstarSegments: 0,
				globSegments: 0,
				rightmostWildcard: true,
				patternLength: 3,
			},
			{
				wildcardSegments: 0,
				globstarSegments: 1,
				globSegments: 0,
				rightmostWildcard: false,
				patternLength: 2,
			},
			{
				wildcardSegments: 1,
				globstarSegments: 1,
				globSegments: 1,
				rightmostWildcard: false,
				patternLength: 4,
			},
		];

		for (const left of samples) {
			expect(compareGlobPathMatches(left, left)).toBe(0);
			for (const right of samples) {
				expect(Math.sign(compareGlobPathMatches(left, right)) | 0).toBe(
					-Math.sign(compareGlobPathMatches(right, left)) | 0,
				);
				for (const third of samples) {
					if (
						compareGlobPathMatches(left, right) < 0 &&
						compareGlobPathMatches(right, third) < 0
					) {
						expect(compareGlobPathMatches(left, third)).toBeLessThan(0);
					}
				}
			}
		}
	});
});
