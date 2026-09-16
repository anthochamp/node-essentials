/**
 * Check whether a value is a Plain Old JavaScript Object — a data bag rather
 * than an instance of something.
 *
 * True when the value was built by `{}`, `new Object()` or
 * `Object.create(null)`, and also when it merely _inherits_ from such an
 * object, because the test follows the prototype chain. A `Date`, a `Map`, an
 * `Error`, an array and a class instance all fail.
 *
 * Reach for it before any operation that treats an object as nothing but its
 * own keys — merging, cloning, deep equality. Walking a `Date`'s own keys finds
 * none and silently discards its value, so this guard is what keeps those
 * operations honest.
 *
 * `Object.create({})` passes here and fails `hasObjectPrototype`; see
 * `isObject` for the whole family and which question each one answers.
 *
 * Because the check reads `value.constructor`, a data bag from another realm
 * (an `iframe`, a `vm` context) fails.
 *
 * @example
 * 	```ts
 * 	isPojo({ a: 1 }); // true
 * 	isPojo(Object.create(null)); // true
 * 	isPojo(Object.create({})); // true — the chain reaches Object.prototype
 * 	isPojo(new Date()); // false
 * 	isPojo([]); // false
 * 	```;
 *
 * @param value The value to check
 * @returns True if the value is a POJO
 */
export function isPojo(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		(value.constructor === Object || Object.getPrototypeOf(value) === null)
	);
}
