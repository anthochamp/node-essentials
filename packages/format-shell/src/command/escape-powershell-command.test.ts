import { expect, suite, test } from "vitest";

import { escapePowerShellCommand } from "./escape-powershell-command.js";

suite("escapePowerShellCommand", () => {
	test("should escape a string for safe use as a PowerShell command", () => {
		expect(escapePowerShellCommand("simple")).toBe("simple");
		expect(escapePowerShellCommand("'")).toBe("`'");
		expect(escapePowerShellCommand('"')).toBe('`"');
		expect(escapePowerShellCommand("`")).toBe("``");
		expect(escapePowerShellCommand("$env:PATH")).toBe("`$env:PATH");
		expect(escapePowerShellCommand("$(Get-Date)")).toBe("`$`(Get-Date`)");
		expect(escapePowerShellCommand("a & b | c ; d")).toBe("a `& b `| c `; d");
		expect(escapePowerShellCommand("@{ a = 1 }")).toBe("`@`{ a = 1 `}");
		expect(escapePowerShellCommand("arr[0]")).toBe("arr`[0`]");
		expect(escapePowerShellCommand("in < out > err")).toBe("in `< out `> err");
		expect(escapePowerShellCommand("a, b")).toBe("a`, b");
		expect(escapePowerShellCommand("trailing # comment")).toBe(
			"trailing `# comment",
		);
		expect(escapePowerShellCommand("new\nline and \xFF byte")).toBe(
			"new`\nline and `\xFF byte",
		);
	});

	test("should leave the characters PowerShell does not parse", () => {
		expect(escapePowerShellCommand("a-b_c.d/e\\f")).toBe("a-b_c.d/e\\f");
		expect(escapePowerShellCommand("50%")).toBe("50%");
	});
});
