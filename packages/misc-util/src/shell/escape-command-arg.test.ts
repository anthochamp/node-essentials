import { describe, expect, it } from "vitest";
import {
	escapePosixShCommandArg,
	escapeWin32CmdCommandArg,
} from "./escape-command-arg.js";

describe("escapeCommandArg", () => {
	it("should escape a string for safe use as a POSIX-compliant shell argument", () => {
		expect(escapePosixShCommandArg("")).toBe("''");
		expect(escapePosixShCommandArg("simple")).toBe("'simple'");
		expect(escapePosixShCommandArg("space string")).toBe("'space string'");
		expect(escapePosixShCommandArg("it's")).toBe("'it'\\''s'");
		expect(escapePosixShCommandArg("a'b'c")).toBe("'a'\\''b'\\''c'");
		expect(escapePosixShCommandArg("''''")).toBe("''\\'''\\'''\\'''\\'''");
		expect(escapePosixShCommandArg("line1\nline2")).toBe("'line1\nline2'");
		expect(
			escapePosixShCommandArg("complex $tring! with #special& chars"),
		).toBe("'complex $tring! with #special& chars'");
	});

	it("should escape a string for safe use as a Windows cmd.exe argument", () => {
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
