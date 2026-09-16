import { expect, suite, test } from "vitest";

import { escapeWin32CmdCommandArg } from "./escape-win32-cmd-command-arg.js";

suite("escapeWin32CmdCommandArg", () => {
	test("should escape a string for safe use as a Windows cmd.exe argument", () => {
		expect(escapeWin32CmdCommandArg("")).toBe('""');
		expect(escapeWin32CmdCommandArg("simple")).toBe('"simple"');
		expect(escapeWin32CmdCommandArg("space string")).toBe('"space string"');
		expect(
			escapeWin32CmdCommandArg('A "complex" %string% with !special! chars \\'),
		).toBe('"A  complex   string  with  special  chars \\\\"');
		expect(escapeWin32CmdCommandArg("Backslashes at end \\\\")).toBe(
			'"Backslashes at end \\\\\\\\"',
		);
		expect(escapeWin32CmdCommandArg("Multiple   spaces")).toBe(
			'"Multiple   spaces"',
		);
		expect(escapeWin32CmdCommandArg("Line1\nLine2")).toBe('"Line1\nLine2"');
	});
});
