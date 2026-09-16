import { UnsupportedError } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { printEnv, printEnvAssignment, printEnvValue } from "./print-env.js";

suite("printEnvValue", () => {
	test("should print each value kind", () => {
		expect(printEnvValue("simple")).toBe("simple");
		expect(printEnvValue("needs quoting")).toBe("needs quoting");
		expect(printEnvValue(42)).toBe("42");
		expect(printEnvValue(-3.14)).toBe("-3.14");
		expect(printEnvValue(9007199254741991n)).toBe("9007199254741991");
		expect(printEnvValue(null)).toBe("");
	});

	test("should print booleans in the requested flavor", () => {
		expect(printEnvValue(true)).toBe("1");
		expect(printEnvValue(false)).toBe("0");
		expect(printEnvValue(true, { boolFlavor: "true/false" })).toBe("true");
		expect(printEnvValue(false, { boolFlavor: "true/false" })).toBe("false");
		expect(printEnvValue(true, { boolFlavor: "yes/no" })).toBe("yes");
		expect(printEnvValue(false, { boolFlavor: "yes/no" })).toBe("no");
		expect(printEnvValue(true, { boolFlavor: "on/off" })).toBe("on");
		expect(printEnvValue(false, { boolFlavor: "on/off" })).toBe("off");
	});

	test("should reject a value it cannot spell", () => {
		expect(() => printEnvValue(undefined as unknown as string)).toThrow(
			UnsupportedError,
		);
		expect(() => printEnvValue({} as unknown as string)).toThrow(
			UnsupportedError,
		);
	});
});

suite("printEnvAssignment", () => {
	test("should leave the value literal in the bare assignment form", () => {
		expect(printEnvAssignment("KEY", "simple")).toBe("KEY=simple");
		expect(printEnvAssignment("KEY", "needs quoting")).toBe(
			"KEY=needs quoting",
		);
		expect(printEnvAssignment("KEY", 'contains"quote')).toBe(
			'KEY=contains"quote',
		);
		expect(printEnvAssignment("KEY", "contains=equals")).toBe(
			"KEY=contains=equals",
		);
		expect(printEnvAssignment("KEY", null)).toBe("KEY=");
	});

	test("should quote a dotenv value only when it needs it", () => {
		const options = { syntax: "dotenv" } as const;

		expect(printEnvAssignment("KEY", "simple", options)).toBe("KEY=simple");
		expect(printEnvAssignment("KEY", "a/b:c@d.e-f", options)).toBe(
			"KEY=a/b:c@d.e-f",
		);
		expect(printEnvAssignment("KEY", "needs quoting", options)).toBe(
			'KEY="needs quoting"',
		);
		expect(printEnvAssignment("KEY", " padded ", options)).toBe(
			'KEY=" padded "',
		);
		expect(printEnvAssignment("KEY", "has # hash", options)).toBe(
			'KEY="has # hash"',
		);
		expect(printEnvAssignment("KEY", 'has "quote"', options)).toBe(
			'KEY="has \\"quote\\""',
		);
		expect(printEnvAssignment("KEY", "line1\nline2", options)).toBe(
			'KEY="line1\\nline2"',
		);
		// `$` would interpolate inside a double-quoted dotenv value.
		expect(printEnvAssignment("KEY", "costs $5", options)).toBe(
			'KEY="costs \\$5"',
		);
	});

	test("should single-quote a posix export, which expands nothing", () => {
		const options = { syntax: "posix-export" } as const;

		expect(printEnvAssignment("KEY", "simple", options)).toBe(
			"export KEY='simple'",
		);
		expect(printEnvAssignment("KEY", "$HOME `id`", options)).toBe(
			"export KEY='$HOME `id`'",
		);
		expect(printEnvAssignment("KEY", "it's", options)).toBe(
			"export KEY='it'\\''s'",
		);
	});

	test("should double a percent in a cmd.exe set", () => {
		const options = { syntax: "win32-set" } as const;

		expect(printEnvAssignment("KEY", "simple", options)).toBe(
			'set "KEY=simple"',
		);
		expect(printEnvAssignment("KEY", "100%", options)).toBe('set "KEY=100%%"');
	});

	test("should reject a cmd.exe value it cannot spell", () => {
		// `set "K=V"` ends at the first quote and cmd.exe has no escape for one.
		expect(() =>
			printEnvAssignment("KEY", 'has "quote"', { syntax: "win32-set" }),
		).toThrow(UnsupportedError);
		expect(() =>
			printEnvAssignment("KEY", "line1\nline2", { syntax: "win32-set" }),
		).toThrow(UnsupportedError);
	});

	test("should reject a name no syntax could read back", () => {
		expect(() => printEnvAssignment("", "v")).toThrow(UnsupportedError);
		expect(() => printEnvAssignment("HAS=EQUALS", "v")).toThrow(
			UnsupportedError,
		);
		expect(() => printEnvAssignment("HAS\nNEWLINE", "v")).toThrow(
			UnsupportedError,
		);
		expect(() => printEnvAssignment("HAS\0NUL", "v")).toThrow(UnsupportedError);
	});

	test("should reject a NUL in a bare assignment, which execve cannot carry", () => {
		expect(() => printEnvAssignment("KEY", "a\0b")).toThrow(UnsupportedError);
	});
});

suite("printEnv", () => {
	test("should print a dotenv document terminated by a newline", () => {
		expect(printEnv({ A: "1", B: "needs quoting" })).toBe(
			'A=1\nB="needs quoting"\n',
		);
	});

	test("should print nothing for no variable", () => {
		expect(printEnv({})).toBe("");
	});

	test("should honour the syntax and the line separator", () => {
		expect(printEnv({ A: "1", B: true }, { syntax: "posix-export" })).toBe(
			"export A='1'\nexport B='1'\n",
		);
		expect(printEnv({ A: "1" }, { newline: "\r\n" })).toBe("A=1\r\n");
	});
});
