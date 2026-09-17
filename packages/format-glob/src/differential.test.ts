import { describe, expect, it } from "vitest";

import { compileGlobRegExpBody } from "./_compile-regexp.js";
import { compileGlobVmBody } from "./_compile-vm.js";
import { requiresVmBackend } from "./_glob-shape.js";
import {
	type GlobDialect,
	type GlobFeatures,
	globFeatures,
} from "./dialect.js";
import { globLimits } from "./limits.js";
import { parseGlob } from "./parse-glob.js";

/**
 * `compileGlob` picks between a native `RegExp` and `@ac-kit/format-regex`'s
 * Pike VM without telling the caller, so the two have to answer identically or
 * the choice is observable. This is the multi-kernel discipline `crypto/*`
 * applies to its own implementations — every kernel of one algorithm agrees
 * bit-for-bit, checked by differential testing — brought outside it: same
 * contract, two implementations, one of them the baseline and the other an
 * optimisation that is only allowed to be faster.
 *
 * The VM is the baseline. Where they disagree, the VM is right.
 */

const DIALECTS: ReadonlyArray<readonly [string, GlobDialect]> = [
	["posix", "posix"],
	["editorconfig", "editorconfig"],
	["gitignore", "gitignore"],
	["bash", "bash"],
	[
		"case-insensitive",
		{ ...globFeatures("editorconfig"), caseSensitive: false },
	],
	[
		"star-crosses-separator",
		{ ...globFeatures("editorconfig"), starCrossesSeparator: true },
	],
	[
		"dot-hidden-editorconfig",
		{ ...globFeatures("editorconfig"), periodMustBeExplicit: true },
	],
	["posix-with-globstar", { ...globFeatures("posix"), globstar: true }],
	[
		"bash-without-dot-rule",
		{ ...globFeatures("bash"), periodMustBeExplicit: false },
	],
	["bash-case-insensitive", { ...globFeatures("bash"), caseSensitive: false }],
	[
		"gitignore-with-braces",
		{ ...globFeatures("gitignore"), braceAlternation: true, braceRange: true },
	],
] satisfies ReadonlyArray<readonly [string, GlobDialect]>;

const PATTERNS: readonly string[] = [
	// Plain text and separators.
	"a",
	"a/b.ts",
	"",
	"/a.ts",
	"a/",
	// Wildcards.
	"*",
	"*.ts",
	"a*",
	"*a*",
	"*a*b*",
	"?",
	"a?c",
	"??",
	"**",
	"**/a.ts",
	"a/**/b",
	"**/**/x",
	"**/*",
	"src/**",
	// Classes.
	"[abc]",
	"[!abc]",
	"[^abc]",
	"[a-z]",
	"[a-zA-Z0-9_]",
	"[]]",
	"[-a]",
	"[[:alpha:]]",
	"[[:digit:]][[:alpha:]]",
	"[[:punct:][:space:]]",
	"[[:nope:]]",
	"x[[:upper:]]*",
	// Braces and ranges.
	"a.{ts,tsx}",
	"{a,b}/{c,d}",
	"{a,{b,c}}",
	"{a,}",
	"v{1..9}.txt",
	"{-2..2}",
	"{1..1000000}",
	"{1..3}{1..3}",
	// Escapes.
	"a\\*b",
	"\\[abc\\]",
	"a\\\\b",
	// The safe extglob operators, which the fast path still handles.
	"@(a|b)",
	"a@(b|c)d",
	"?(a|b)",
	"a?(b|c)d",
	"@(*.ts|*.tsx)",
	"?(*.ts)",
	"@(a|@(b|c))",
	// Pattern-level directives.
	"!*.ts",
	"!!a",
	"#comment",
	"\\!a",
	// Adversarial shapes.
	"*/*/*/*/*",
	"**/**/**/x",
	"a**b",
	"*.*.*.*",
	"[a-z]*[a-z]*[a-z]*",
];

const INPUTS: readonly string[] = [
	"",
	"a",
	"A",
	"ab",
	"abc",
	"a.ts",
	"A.TS",
	"a.tsx",
	"a.js",
	".env",
	".",
	"..",
	"a/b",
	"a/b.ts",
	"src/a.ts",
	"src/deep/a.ts",
	"src/deep/.env",
	"a/b/c/d/e",
	"v3.txt",
	"v10.txt",
	"-1",
	"999999",
	"1000001",
	"11",
	"[abc]",
	"a*b",
	"a\\b",
	"@(a|b)",
	"#comment",
	"!a",
	"a\nb",
	"a/",
	"/a.ts",
	"x]",
	"]",
	"-",
	" ",
	"\t",
	"a".repeat(64),
	`${"a/".repeat(20)}b`,
];

describe("backend agreement", () => {
	const bounds = globLimits();

	for (const [name, dialect] of DIALECTS) {
		describe(name, () => {
			for (const pattern of PATTERNS) {
				it(`agrees on ${JSON.stringify(pattern)}`, () => {
					const features: GlobFeatures = globFeatures(dialect);
					const parsed = parseGlob(pattern, dialect);
					if (requiresVmBackend(parsed, features)) {
						// The fast path cannot express this one; there is nothing to
						// compare it against, and the other suite covers it.
						return;
					}

					const viaRegExp = compileGlobRegExpBody(parsed, features);
					const viaVm = compileGlobVmBody(parsed, features, bounds);

					for (const input of INPUTS) {
						expect(
							viaVm(input),
							`${JSON.stringify(pattern)} vs ${JSON.stringify(input)}`,
						).toBe(viaRegExp(input));
					}
				});
			}
		});
	}
});

describe("backend selection", () => {
	function backend(pattern: string, dialect: GlobDialect): "regexp" | "vm" {
		return requiresVmBackend(parseGlob(pattern, dialect), globFeatures(dialect))
			? "vm"
			: "regexp";
	}

	it("keeps the fast path under a permissive dialect", () => {
		// The point of deciding on the AST as well as on the dialect: `"bash"`
		// would otherwise send every pattern to the VM.
		for (const pattern of [
			"*.ts",
			"**/a",
			"@(a|b)",
			"?(a)",
			"!*.ts",
			"[a-z]",
		]) {
			expect(backend(pattern, "bash")).toBe("regexp");
		}
	});

	it("takes the VM for every construct the fast path cannot survive", () => {
		for (const pattern of [
			"!(a)",
			"*(a|b)",
			"+(a|b)",
			"x/!(a)/y",
			"@(a|!(b))",
			"{a,*(b)}",
		]) {
			expect(backend(pattern, "bash")).toBe("vm");
		}
	});

	it("never needs the VM for a dialect without extglob or negation", () => {
		for (const dialect of ["posix", "editorconfig", "gitignore"] as const) {
			for (const pattern of [...PATTERNS, "!(a)", "*(a|b)"]) {
				expect(backend(pattern, dialect)).toBe("regexp");
			}
		}
	});
});
