/**
 * Escape a string to be safely used as a shell argument in Windows cmd.exe
 *
 * It adds double quotes around a string and escapes any existing problematic
 * characters (such as %, !, and ") by replacing them with spaces. Backslashes
 * are escaped by doubling them.
 *
 * Example:
 *
 * ```ts
 * const unsafe = 'A "complex" %string% with !special! chars \\';
 * const safe = escapeShellArgWindows(unsafe);
 * console.log(safe); // "A  complex  string  with  special  chars \\"
 * ```
 *
 * @param expr The string to escape
 * @returns The escaped string
 */
export function escapeWin32CmdCommandArg(expr: string): string {
	if (expr === "") {
		return '""';
	}

	// Replace problematic characters with spaces
	expr = expr.replace(/[%!"]/g, " ");

	// Escape backslashes by double them
	expr = expr.replace(/\\/g, "\\\\");

	return `"${expr}"`;
}
