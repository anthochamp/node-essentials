import { expect, suite, test } from "vitest";

import { escapePowerShellCommandArg } from "./escape-powershell-command-arg.js";

suite("escapePowerShellCommandArg", () => {
	test("should wrap the argument in single quotes", () => {
		expect(escapePowerShellCommandArg("")).toBe("''");
		expect(escapePowerShellCommandArg("simple")).toBe("'simple'");
		expect(escapePowerShellCommandArg("space string")).toBe("'space string'");
		expect(escapePowerShellCommandArg("line1\nline2")).toBe("'line1\nline2'");
	});

	test("should double an existing single quote", () => {
		expect(escapePowerShellCommandArg("test's")).toBe("'test''s'");
		expect(escapePowerShellCommandArg("a'b'c")).toBe("'a''b''c'");
		expect(escapePowerShellCommandArg("''''")).toBe("''''''''''");
	});

	test("should leave the characters single quotes already neutralize", () => {
		// PowerShell expands nothing inside single quotes, so a variable, a
		// subexpression and a backtick all survive as written.
		expect(escapePowerShellCommandArg("$env:PATH")).toBe("'$env:PATH'");
		expect(escapePowerShellCommandArg("$(Get-Date)")).toBe("'$(Get-Date)'");
		expect(escapePowerShellCommandArg("a `t b")).toBe("'a `t b'");
		expect(escapePowerShellCommandArg('say "hi"')).toBe("'say \"hi\"'");
	});
});
