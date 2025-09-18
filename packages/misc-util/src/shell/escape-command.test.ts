import { expect, suite, test } from "vitest";
import {
	escapePosixShCommand,
	escapeWin32CmdCommand,
} from "./escape-command.js";

suite("escapeCommand", () => {
	test("should escape a string for safe use as a POSIX-compliant shell command", () => {
		expect(escapePosixShCommand("simple")).toBe("simple");
		expect(escapePosixShCommand("'")).toBe("\\'");
		expect(escapePosixShCommand("''")).toBe("''");
		expect(escapePosixShCommand("'\"'")).toBe("'\\\"'");
		expect(escapePosixShCommand('"')).toBe('\\"');
		expect(escapePosixShCommand('""')).toBe('""');
		expect(escapePosixShCommand('"\'"')).toBe('"\\\'"');
		expect(escapePosixShCommand("complex & string; with|special`chars")).toBe(
			"complex \\& string\\; with\\|special\\`chars",
		);
		expect(escapePosixShCommand("command $(rm -rf /) && echo 'done'")).toBe(
			"command \\$\\(rm -rf /\\) \\&\\& echo 'done'",
		);
		expect(escapePosixShCommand("unsafe `command` with $(substitution)")).toBe(
			"unsafe \\`command\\` with \\$\\(substitution\\)",
		);
		expect(escapePosixShCommand("brackets { [ ( <		> ) ] }")).toBe(
			"brackets \\{ \\[ \\( \\<		\\> \\) \\] \\}",
		);
		expect(escapePosixShCommand("dollar $ sign and backslash \\")).toBe(
			"dollar \\$ sign and backslash \\\\",
		);
		expect(escapePosixShCommand("new\nline and \xFF byte")).toBe(
			"new\\\nline and \\ÿ byte",
		);
	});

	test("should escape a string for safe use as a Windows cmd.exe command", () => {
		expect(escapeWin32CmdCommand("simple")).toBe("simple");
		expect(escapeWin32CmdCommand("'")).toBe("^'");
		expect(escapeWin32CmdCommand("''")).toBe("^'^'");
		expect(escapeWin32CmdCommand("'\"'")).toBe("^'^\"^'");
		expect(escapeWin32CmdCommand('"')).toBe('^"');
		expect(escapeWin32CmdCommand('""')).toBe('^"^"');
		expect(escapeWin32CmdCommand('"\'"')).toBe('^"^\'^"');
		expect(escapeWin32CmdCommand("complex & string; with|special`chars^")).toBe(
			"complex ^& string^; with^|special^`chars^^",
		);
		expect(escapeWin32CmdCommand('command %rm -rf /% && echo "done"')).toBe(
			'command ^%rm -rf /^% ^&^& echo ^"done^"',
		);
		expect(escapeWin32CmdCommand("unsafe `command` with %substitution%")).toBe(
			"unsafe ^`command^` with ^%substitution^%",
		);
		expect(escapeWin32CmdCommand("brackets { [ ( < > ) ] }")).toBe(
			"brackets ^{ ^[ ^( ^< ^> ^) ^] ^}",
		);
		expect(escapeWin32CmdCommand("dollar $ sign and backslash \\\\")).toBe(
			"dollar ^$ sign and backslash ^\\^\\",
		);
		expect(escapeWin32CmdCommand("new\nline and \xFF byte")).toBe(
			"new^\nline and ^\xFF byte",
		);
	});
});
