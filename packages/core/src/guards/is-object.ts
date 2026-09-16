/**
 * Check whether a value is a non-null object that is not an array.
 *
 * A function never passes: `typeof` reports it as `"function"`, not `"object"`.
 * Everything else non-primitive does — a `Date`, a `Map`, a `Promise`, a class
 * instance, an `Object.create(null)` bag.
 *
 * Reach for it when the next thing you do is read a property off the value and
 * an array would take a different branch. It answers _"is there an object
 * here"_, not _"is this object a data bag"_.
 *
 * The family, from loosest to strictest:
 *
 * - `isObject` — any non-null, non-array object, whatever built it.
 * - `isPojo` — narrows to `Record<string, unknown>`; rejects a `Date`, a `Map`
 *   and a class instance, whose prototype chain does not reach
 *   `Object.prototype`. Use it before merging, cloning or deep-comparing, where
 *   walking a `Date`'s own keys would silently drop its value.
 * - `hasObjectPrototype` — the same question asked of the _own_ prototype only,
 *   so `Object.create({})` fails where `isPojo` passes. Use it when the answer
 *   decides how a value is rebuilt, not just how it is read.
 *
 * @example
 * 	```ts
 * 	isObject({}); // true
 * 	isObject(new Date()); // true
 * 	isObject([]); // false
 * 	isObject(null); // false
 * 	isObject(() => {}); // false
 * 	```;
 *
 * @param value The value to check
 * @returns True if the value is a non-array object
 */
export function isObject(value: unknown): value is object {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
