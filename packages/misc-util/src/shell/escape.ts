/**
 * Enclosing characters in single quotes preserves the literal meaning of all
 * the characters (except single quotes, making it impossible to put
 * single-quotes in a single-quoted string).
 */
export function escapeSQE(expr: string): string {
	return expr.replaceAll("'", "'\\''");
}
