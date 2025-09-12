import { escapePosixShSqe } from "./escape-posix-sh-sqe.js";

/**
 * Escape a string to be safely used as a shell argument, depending on the
 * current platform (POSIX-compliant shell or Windows cmd.exe).
 *
 * On POSIX, it adds single quotes around a string and quotes/escapes any existing single
 * quotes.
 * On Windows, it adds double quotes around a string and escapes any existing problematic
 * characters (such as %, !, and ") by replacing them with spaces. Backslashes
 * are escaped by doubling them.
 *
 * @param expr The string to escape
 * @returns The escaped string
 */
export const escapeCommandArg: (expr: string) => string =
	process.platform === "win32"
		? escapeWin32CmdCommandArg
		: escapePosixShCommandArg;

/**
 * Escape a string to be safely used as a shell argument in POSIX-compliant shells
 *
 * It adds single quotes around a string and quotes/escapes any existing single
 * quotes.
 *
 * Example:
 * ```ts
 * const unsafe = "It's a test";
 * const safe = escapeShellArgPosix(unsafe);
 * console.log(safe); // 'It'\''s a test'
 * ```
 *
 * @param expr The string to escape
 * @returns The escaped string
 */
export function escapePosixShCommandArg(expr: string): string {
	if (expr === "") {
		return "''";
	}

	return `'${escapePosixShSqe(expr)}'`;
}

/**
 * Escape a string to be safely used as a shell argument in Windows cmd.exe
 *
 * It adds double quotes around a string and escapes any existing problematic
 * characters (such as %, !, and ") by replacing them with spaces. Backslashes
 * are escaped by doubling them.
 *
 * Example:
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
