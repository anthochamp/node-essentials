import { escapePosixShSqe } from "./escape-posix-sh-sqe.js";

/**
 * Escape a string to be safely used as a shell argument in POSIX-compliant
 * shells
 *
 * It adds single quotes around a string and quotes/escapes any existing single
 * quotes.
 *
 * Example:
 *
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
