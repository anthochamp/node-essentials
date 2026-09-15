/**
 * Check if a value is a {@link PropertyKey} — a valid JavaScript object property
 * key.
 *
 * @param value The value to check
 * @returns True if the value is a {@link PropertyKey}
 */
export function isPropertyKey(value: unknown): value is PropertyKey {
	const type = typeof value;
	return type === "string" || type === "number" || type === "symbol";
}
