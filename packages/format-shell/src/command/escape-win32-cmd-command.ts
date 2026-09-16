/**
 * Escape any characters in a string that might be used to trick a Windows
 * cmd.exe command into executing arbitrary commands.
 *
 * It escapes the following characters by adding a caret (^) before them:
 * '"%!&#;`|*?~<>^()[]{}$, \n and \xFF.
 *
 * Based on PHP escapeshellcmd:
 * https://www.php.net/manual/en/function.escapeshellcmd.php
 *
 * Source code:
 * https://github.com/php/php-src/blob/d85662d6cc2c6d5f69403f6fb2001ff78e1bd174/ext/standard/exec.c#L270
 *
 * @param cmd The command to escape
 * @returns The escaped command
 */
export function escapeWin32CmdCommand(cmd: string): string {
	return cmd.replace(/(['"%!&#;`|*?~<>^()[\]{}$\\\n\xFF])/g, "^$1");
}
