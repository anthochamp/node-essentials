/**
 * Escape a string to be safely used in a single-quoted shell command.
 *
 * Example:
 * ```ts
 * const unsafe = "It's a test";
 * const safe = escapePosixShSqe(unsafe);
 * console.log(safe); // It'\''s a test
 * ```
 */
export function escapePosixShSqe(expr: string): string {
	return expr.replace(/'/g, "'\\''");
}
