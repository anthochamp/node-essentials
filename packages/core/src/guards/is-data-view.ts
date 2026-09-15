/**
 * Check if a value is a `DataView`.
 *
 * Realm-bound: a `DataView` built in another realm (worker, iframe, vm context)
 * is not recognised.
 *
 * @param value The value to check
 * @returns True if the value is a `DataView`
 */
export function isDataView(value: unknown): value is DataView {
	return value instanceof DataView;
}
