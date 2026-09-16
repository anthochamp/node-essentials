/**
 * Check whether a value's own prototype is `Object.prototype` or `null`.
 *
 * Strictly narrower than `isPojo`, which follows the whole prototype chain and
 * so also accepts `Object.create({})`. Both ask "is this a data bag"; this one
 * refuses a bag that inherits from another bag.
 *
 * Reach for it when the answer decides how a value is _rebuilt_ rather than how
 * it is read — a traversal that rewrites a node into a fresh `{}`, a serializer
 * choosing between an object form and a tagged form. Inherited keys are lost by
 * such a rebuild, so a chain-following test would claim a fidelity the output
 * does not have. When you only mean to read own keys, `isPojo` is the more
 * forgiving question; see `isObject` for the whole family.
 *
 * @example
 * 	```ts
 * 	hasObjectPrototype({}); // true
 * 	hasObjectPrototype(Object.create(null)); // true
 * 	hasObjectPrototype(Object.create({})); // false
 * 	hasObjectPrototype(new Date()); // false
 * 	```;
 *
 * @param value The object to check.
 * @returns True if nothing sits between the value and `Object.prototype`.
 */
export function hasObjectPrototype(value: object): boolean {
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}
