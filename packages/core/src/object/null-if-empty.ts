/**
 * Normalizes an object with no own enumerable property to `null`.
 *
 * Useful against APIs that report "no value" as an empty object rather than as
 * `null` or `undefined`, so that callers only have one absent form to test.
 *
 * @param value The object to normalize.
 * @returns The object, or `null` when it is absent or has no own enumerable
 *   property.
 */
export function nullIfEmpty<T extends object>(
	value: T | null | undefined,
): T | null {
	if (value === null || value === undefined) {
		return null;
	}

	return Object.keys(value).length === 0 ? null : value;
}
