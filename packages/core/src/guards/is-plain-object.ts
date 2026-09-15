/**
 * Check if a value's own prototype is `Object.prototype` or null.
 *
 * Deliberately not `isPojo`, which follows the prototype chain and so also
 * accepts `Object.create({})`.
 */
export function isPlainObject(value: object): boolean {
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}
