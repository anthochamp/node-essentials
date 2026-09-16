/**
 * Assign into a record whose keys come from untrusted input.
 *
 * `record[key] = value` runs the `__proto__` setter inherited from
 * `Object.prototype`, so one key out of parsed text can replace the prototype
 * of every object built afterwards. Defining the property instead stores an
 * ordinary own `__proto__` entry and reaches no setter, leaving the record an
 * otherwise normal object: same prototype, same spread, same `deepEqual`.
 *
 * Costs one string comparison over a plain assignment for every other key, so
 * it is safe to call from a parser loop — `Object.defineProperty` is far slower
 * and is taken only for the single key that needs it.
 *
 * This guards a **write**. A caller walking a path of untrusted keys must also
 * guard its reads with `isUnsafeRecordKey`: stepping through `constructor` and
 * then `prototype` pollutes without ever assigning to `__proto__`.
 *
 * @example
 * 	```ts
 * 	const parsed: Record<string, unknown> = {};
 * 	setRecordEntry(parsed, "__proto__", { polluted: true });
 *
 * 	parsed["__proto__"]; // { polluted: true } — an own entry
 * 	Object.getPrototypeOf(parsed) === Object.prototype; // true — untouched
 * 	```;
 *
 * @param record The record to assign into.
 * @param key The key, which may come from untrusted input.
 * @param value The value to store.
 */
export function setRecordEntry<T>(
	record: Record<string, T>,
	key: string,
	value: NoInfer<T>,
): void {
	if (key === "__proto__") {
		Object.defineProperty(record, key, {
			value,
			enumerable: true,
			writable: true,
			configurable: true,
		});
		return;
	}

	record[key] = value;
}
