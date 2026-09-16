import { expect, suite, test } from "vitest";

import { escapeWin32CmdCommand } from "./escape-win32-cmd-command.js";

suite("escapeWin32CmdCommand", () => {
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
