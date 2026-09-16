import { expect, suite, test } from "vitest";

import { escapePosixShCommand } from "./escape-posix-sh-command.js";

suite("escapePosixShCommand", () => {
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
});
