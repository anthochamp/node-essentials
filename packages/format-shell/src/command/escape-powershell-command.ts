/**
 * Escape any characters in a string that might be used to trick a PowerShell
 * command into executing arbitrary commands.
 *
 * It escapes the following characters by adding a backtick (`) before them:
 * '"`$#&|;,(){}[]<>@, \n and \xFF.
 *
 * The backtick is PowerShell's escape character, the counterpart of the
 * backslash `escapePosixShCommand` uses and the caret `escapeWin32CmdCommand`
 * uses.
 *
 * @param cmd The command to escape
 * @returns The escaped command
 */
export function escapePowerShellCommand(cmd: string): string {
	return cmd.replace(/(['"`$#&|;,(){}[\]<>@\n\xFF])/g, "`$1");
}
