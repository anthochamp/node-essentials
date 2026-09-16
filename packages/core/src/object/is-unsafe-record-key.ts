/**
 * Check whether a key may be followed while walking a record built from
 * untrusted input.
 *
 * `__proto__` reaches the prototype setter when assigned to; `constructor`
 * followed by `prototype` reaches `Object.prototype` when merely read, and a
 * path-walking writer then mutates it. All three names are rejected together
 * because a walk cannot tell which position it is in until the damage is done.
 *
 * Use this for a **path**. A single leaf assignment wants `setRecordEntry`
 * instead, which stores such a key rather than refusing it — a record of
 * environment variables or INI settings should still be able to hold one named
 * `constructor`.
 *
 * @example
 * 	```ts
 * 	isUnsafeRecordKey("__proto__"); // true
 * 	isUnsafeRecordKey("constructor"); // true
 * 	isUnsafeRecordKey("toString"); // false — shadowing is not pollution
 * 	```;
 *
 * @param key The key to check.
 * @returns True if following the key can reach a shared prototype.
 */
export function isUnsafeRecordKey(key: PropertyKey): boolean {
	return key === "__proto__" || key === "constructor" || key === "prototype";
}
