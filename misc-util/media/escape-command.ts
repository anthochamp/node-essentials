/**
 * Escapes any characters in a string that might be used to trick a shell command
 * into executing arbitrary commands.
 *
 * It uses different escaping mechanisms depending on the current platform:
 * - On Windows, it uses caret (^) to escape special characters.
 * - On POSIX-compliant systems, it uses backslash (\) to escape special characters.
 *
 * @param cmd The command to escape
 * @returns The escaped command
 */
export const escapeCommand: (cmd: string) => string =
	process.platform === "win32" ? escapeWin32CmdCommand : escapePosixShCommand;

/**
 * Escapes any characters in a string that might be used to trick a POSIX-compliant
 * shell command into executing arbitrary commands.
 *
 * It escapes the following characters by adding a backslash before them:
 * &#;`|*?~<>^()[]{}$\, \n and \xFF.
 *
 * The characters ' and " are escaped only if they are not paired.
 *
 * Based on PHP escapeshellcmd: https://www.php.net/manual/en/function.escapeshellcmd.php
 * Source code: https://github.com/php/php-src/blob/d85662d6cc2c6d5f69403f6fb2001ff78e1bd174/ext/standard/exec.c#L270
 *
 * @param cmd The command to escape
 * @returns The escaped command
 */
export function escapePosixShCommand(cmd: string): string {
	// Escape any of the special characters with a backslash
	cmd = cmd.replace(/([&#;`|*?~<>^()[\]{}$\\\n\xFF])/g, "\\$1");

	// Escape unpaired quotes by preceding them with a backslash
	let result = "";
	let lastMatchingQuoteIndex = -1;

	for (let i = 0; i < cmd.length; i++) {
		const c = cmd[i];

		if (c === "'" || c === '"') {
			if (lastMatchingQuoteIndex === -1) {
				lastMatchingQuoteIndex = cmd.indexOf(c, i + 1);
				if (lastMatchingQuoteIndex === -1) {
					// No matching quote found, escape this one
					result += `\\${c}`;
				} else {
					result += c;
				}
			} else {
				if (cmd[lastMatchingQuoteIndex] === c) {
					// Found the matching quote for the last opened quote
					lastMatchingQuoteIndex = -1;
					result += c;
				} else {
					// The quote is not matching the last opened quote, escape it
					result += `\\${c}`;
				}
			}
		} else {
			result += c;
		}
	}

	return result;
}

/**
 * Escape any characters in a string that might be used to trick a Windows cmd.exe
 * command into executing arbitrary commands.
 *
 * It escapes the following characters by adding a caret (^) before them:
 * '"%!&#;`|*?~<>^()[]{}$\, \n and \xFF.
 *
 * Based on PHP escapeshellcmd: https://www.php.net/manual/en/function.escapeshellcmd.php
 * Source code: https://github.com/php/php-src/blob/d85662d6cc2c6d5f69403f6fb2001ff78e1bd174/ext/standard/exec.c#L270
 *
 * @param cmd The command to escape
 * @returns The escaped command
 */
export function escapeWin32CmdCommand(cmd: string): string {
	return cmd.replace(/(['"%!&#;`|*?~<>^()[\]{}$\\\n\xFF])/g, "^$1");
}
