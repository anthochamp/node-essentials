import { escapePosixShCommandArg } from "./escape-posix-sh-command-arg.js";
import { escapePosixShCommand } from "./escape-posix-sh-command.js";
import { escapePowerShellCommandArg } from "./escape-powershell-command-arg.js";
import { escapePowerShellCommand } from "./escape-powershell-command.js";
import { escapeWin32CmdCommandArg } from "./escape-win32-cmd-command-arg.js";
import { escapeWin32CmdCommand } from "./escape-win32-cmd-command.js";

/**
 * The shell language a command line is written in.
 *
 * It names the shell's grammar, not the operating system running it: PowerShell
 * is the default shell on Windows Server but also runs on Linux and macOS, and
 * a POSIX shell is what runs under WSL, Cygwin and Git Bash on Windows.
 */
export type ShellDialect = "posix-sh" | "win32-cmd" | "powershell";

/**
 * Escape a string to be safely used as a single argument of a command line
 * written in the given dialect.
 *
 * @param expr The string to escape
 * @param dialect The shell language the command line is written in
 * @returns The escaped string
 */
export function escapeCommandArg(expr: string, dialect: ShellDialect): string {
	switch (dialect) {
		case "posix-sh":
			return escapePosixShCommandArg(expr);

		case "win32-cmd":
			return escapeWin32CmdCommandArg(expr);

		case "powershell":
			return escapePowerShellCommandArg(expr);
	}
}

/**
 * Escape any characters in a string that might be used to trick a command line
 * written in the given dialect into executing arbitrary commands.
 *
 * Prefer `escapeCommandArg` whenever the string is one argument rather than a
 * whole command: neutralizing metacharacters leaves a string that the shell
 * still splits on whitespace.
 *
 * @param cmd The command to escape
 * @param dialect The shell language the command is written in
 * @returns The escaped command
 */
export function escapeCommand(cmd: string, dialect: ShellDialect): string {
	switch (dialect) {
		case "posix-sh":
			return escapePosixShCommand(cmd);

		case "win32-cmd":
			return escapeWin32CmdCommand(cmd);

		case "powershell":
			return escapePowerShellCommand(cmd);
	}
}

/**
 * Map an operating system identifier, as `process.platform` spells it, to the
 * shell dialect a command runs under by default there.
 *
 * A platform does not determine a shell — it only names the default one, which
 * is what `child_process.exec` and its equivalents spawn. A caller that knows
 * it is driving a different shell passes that dialect instead.
 *
 * @param platform The operating system identifier
 * @returns The dialect of that platform's default shell
 */
export function shellDialectForPlatform(platform: string): ShellDialect {
	return platform === "win32" ? "win32-cmd" : "posix-sh";
}
