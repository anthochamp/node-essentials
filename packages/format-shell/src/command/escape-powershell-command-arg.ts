/**
 * Escape a string to be safely used as a PowerShell command argument.
 *
 * It wraps the string in single quotes — inside which PowerShell performs no
 * variable expansion, no subexpression evaluation and no backtick escaping —
 * and doubles any single quote the string already contains, which is the only
 * escape the single-quoted form recognises.
 *
 * Example:
 *
 * ```ts
 * const unsafe = "It's $(a) `test`";
 * const safe = escapePowerShellCommandArg(unsafe);
 * console.log(safe); // 'It''s $(a) `test`'
 * ```
 *
 * @param expr The string to escape
 * @returns The escaped string
 */
export function escapePowerShellCommandArg(expr: string): string {
	if (expr === "") {
		return "''";
	}

	return `'${expr.replace(/'/g, "''")}'`;
}
