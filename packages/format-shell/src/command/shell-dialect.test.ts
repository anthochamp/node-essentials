import { expect, suite, test } from "vitest";

import { escapePosixShCommandArg } from "./escape-posix-sh-command-arg.js";
import { escapePosixShCommand } from "./escape-posix-sh-command.js";
import { escapePowerShellCommandArg } from "./escape-powershell-command-arg.js";
import { escapePowerShellCommand } from "./escape-powershell-command.js";
import { escapeWin32CmdCommandArg } from "./escape-win32-cmd-command-arg.js";
import { escapeWin32CmdCommand } from "./escape-win32-cmd-command.js";
import {
	escapeCommand,
	escapeCommandArg,
	type ShellDialect,
	shellDialectForPlatform,
} from "./shell-dialect.js";

const SAMPLE = 'It\'s a "test" $with `every` <metacharacter>';

suite("escapeCommandArg", () => {
	test("should dispatch to the dialect's own escape", () => {
		expect(escapeCommandArg(SAMPLE, "posix-sh")).toBe(
			escapePosixShCommandArg(SAMPLE),
		);
		expect(escapeCommandArg(SAMPLE, "win32-cmd")).toBe(
			escapeWin32CmdCommandArg(SAMPLE),
		);
		expect(escapeCommandArg(SAMPLE, "powershell")).toBe(
			escapePowerShellCommandArg(SAMPLE),
		);
	});

	test("should quote the empty string in every dialect", () => {
		const dialects: ShellDialect[] = ["posix-sh", "win32-cmd", "powershell"];

		for (const dialect of dialects) {
			expect(escapeCommandArg("", dialect).length).toBe(2);
		}
	});
});

suite("escapeCommand", () => {
	test("should dispatch to the dialect's own escape", () => {
		expect(escapeCommand(SAMPLE, "posix-sh")).toBe(
			escapePosixShCommand(SAMPLE),
		);
		expect(escapeCommand(SAMPLE, "win32-cmd")).toBe(
			escapeWin32CmdCommand(SAMPLE),
		);
		expect(escapeCommand(SAMPLE, "powershell")).toBe(
			escapePowerShellCommand(SAMPLE),
		);
	});
});

suite("shellDialectForPlatform", () => {
	test("should name cmd.exe on Windows and a POSIX shell everywhere else", () => {
		expect(shellDialectForPlatform("win32")).toBe("win32-cmd");
		expect(shellDialectForPlatform("linux")).toBe("posix-sh");
		expect(shellDialectForPlatform("darwin")).toBe("posix-sh");
		expect(shellDialectForPlatform("freebsd")).toBe("posix-sh");
		// Cygwin runs a POSIX shell despite living on Windows.
		expect(shellDialectForPlatform("cygwin")).toBe("posix-sh");
	});
});
