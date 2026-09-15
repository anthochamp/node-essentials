/**
 * Check if a value is a `Date`.
 *
 * A `Date` holding `NaN` (an invalid date) still passes — this answers what the
 * value is, not whether it is usable.
 *
 * Realm-bound: a `Date` built in another realm (worker, iframe, vm context) is
 * not recognised.
 *
 * @param value The value to check
 * @returns True if the value is a `Date`
 */
export function isDate(value: unknown): value is Date {
	return value instanceof Date;
}
