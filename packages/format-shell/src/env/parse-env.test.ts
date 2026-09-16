import { expect, suite, test } from "vitest";

import { parseEnv, parseEnvAssignment } from "./parse-env.js";
import { printEnv, printEnvAssignment } from "./print-env.js";
import type { EnvSyntax } from "./types.js";

suite("parseEnvAssignment", () => {
	test("should take everything after the first equals in the bare form", () => {
		expect(parseEnvAssignment("KEY=simple")).toEqual({
			name: "KEY",
			value: "simple",
		});
		expect(parseEnvAssignment("KEY= padded ")).toEqual({
			name: "KEY",
			value: " padded ",
		});
		expect(parseEnvAssignment("KEY=a=b")).toEqual({
			name: "KEY",
			value: "a=b",
		});
		expect(parseEnvAssignment('KEY="quoted"')).toEqual({
			name: "KEY",
			value: '"quoted"',
		});
		expect(parseEnvAssignment("KEY=not # a comment")).toEqual({
			name: "KEY",
			value: "not # a comment",
		});
	});

	test("should read a name with no equals as an empty value", () => {
		expect(parseEnvAssignment("KEY")).toEqual({ name: "KEY", value: "" });
		expect(parseEnvAssignment("KEY=")).toEqual({ name: "KEY", value: "" });
	});

	test("should never guess a type", () => {
		expect(parseEnvAssignment("KEY=42")).toEqual({ name: "KEY", value: "42" });
		expect(parseEnvAssignment("KEY=true")).toEqual({
			name: "KEY",
			value: "true",
		});
	});

	test("should unquote a dotenv value", () => {
		const options = { syntax: "dotenv" } as const;

		expect(parseEnvAssignment("KEY=simple", options)).toEqual({
			name: "KEY",
			value: "simple",
		});
		expect(parseEnvAssignment('KEY="needs quoting"', options)).toEqual({
			name: "KEY",
			value: "needs quoting",
		});
		expect(parseEnvAssignment('KEY="has \\"quote\\""', options)).toEqual({
			name: "KEY",
			value: 'has "quote"',
		});
		expect(parseEnvAssignment('KEY="line1\\nline2"', options)).toEqual({
			name: "KEY",
			value: "line1\nline2",
		});
		// Single quotes are literal, as in POSIX.
		expect(parseEnvAssignment("KEY='no \\n escape'", options)).toEqual({
			name: "KEY",
			value: "no \\n escape",
		});
		expect(parseEnvAssignment("  KEY  =  spaced  ", options)).toEqual({
			name: "KEY",
			value: "spaced",
		});
	});

	test("should strip a dotenv comment only when whitespace precedes it", () => {
		const options = { syntax: "dotenv" } as const;

		expect(parseEnvAssignment("KEY=value # trailing", options)).toEqual({
			name: "KEY",
			value: "value",
		});
		expect(parseEnvAssignment("KEY=http://h/p#frag", options)).toEqual({
			name: "KEY",
			value: "http://h/p#frag",
		});
		expect(parseEnvAssignment('KEY="keeps # inside"', options)).toEqual({
			name: "KEY",
			value: "keeps # inside",
		});
	});

	test("should report a line carrying no assignment", () => {
		const options = { syntax: "dotenv" } as const;

		expect(parseEnvAssignment("", options)).toBe(null);
		expect(parseEnvAssignment("   ", options)).toBe(null);
		expect(parseEnvAssignment("# a comment", options)).toBe(null);
		expect(parseEnvAssignment("   # indented comment", options)).toBe(null);
	});

	test("should accept the export and set prefixes", () => {
		expect(
			parseEnvAssignment("export KEY='simple'", { syntax: "posix-export" }),
		).toEqual({ name: "KEY", value: "simple" });
		expect(parseEnvAssignment("export KEY=bare", { syntax: "dotenv" })).toEqual(
			{ name: "KEY", value: "bare" },
		);
		expect(
			parseEnvAssignment('set "KEY=100%%"', { syntax: "win32-set" }),
		).toEqual({ name: "KEY", value: "100%" });
		expect(
			parseEnvAssignment("SET KEY=simple", { syntax: "win32-set" }),
		).toEqual({ name: "KEY", value: "simple" });
	});
});

suite("parseEnv", () => {
	test("should skip blank lines and comments", () => {
		const source = ["# header", "", "A=1", "  ", "B=2 # trailing"].join("\n");

		expect(parseEnv(source)).toEqual({ A: "1", B: "2" });
	});

	test("should let the last assignment to a name win", () => {
		expect(parseEnv("A=1\nA=2\n")).toEqual({ A: "2" });
	});

	test("should read CRLF documents", () => {
		expect(parseEnv("A=1\r\nB=2\r\n")).toEqual({ A: "1", B: "2" });
	});

	test("should join a quoted value spanning lines", () => {
		const source = 'KEY="line1\nline2\nline3"\nAFTER=1\n';

		expect(parseEnv(source)).toEqual({
			KEY: "line1\nline2\nline3",
			AFTER: "1",
		});
	});

	test("should not let a variable named __proto__ reach the prototype", () => {
		const parsed = parseEnv("__proto__=polluted\nA=1\n");

		expect(Object.getPrototypeOf({})).toBe(Object.prototype);
		expect(parsed.__proto__).toBe("polluted");
		expect(parsed.A).toBe("1");
	});
});

suite("round trip", () => {
	const VALUES = [
		"simple",
		"",
		"needs quoting",
		" padded ",
		'has "quote"',
		"has 'single'",
		"has # hash",
		"has = equals",
		"costs $5 `id`",
		"line1\nline2",
		"tab\there",
		"a/b:c@d.e-f",
	];

	const SYNTAXES: EnvSyntax[] = ["assignment", "dotenv", "posix-export"];

	test("should read back exactly what it printed", () => {
		for (const syntax of SYNTAXES) {
			for (const value of VALUES) {
				const printed = printEnvAssignment("KEY", value, { syntax });

				expect(
					parseEnvAssignment(printed, { syntax }),
					`${syntax}: ${JSON.stringify(value)} printed as ${printed}`,
				).toEqual({ name: "KEY", value });
			}
		}
	});

	test("should read back a whole printed document", () => {
		const variables = Object.fromEntries(
			VALUES.map((value, index) => [`KEY${index}`, value]),
		);

		for (const syntax of SYNTAXES) {
			if (syntax === "assignment") {
				// The bare form is one argv entry, not a document: a value holding a
				// newline would spill onto the next line with nothing to close it.
				continue;
			}

			expect(parseEnv(printEnv(variables, { syntax }), { syntax })).toEqual(
				variables,
			);
		}
	});
});
