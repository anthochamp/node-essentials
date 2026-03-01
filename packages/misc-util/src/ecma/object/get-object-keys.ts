export type GetObjectKeysOptions = {
	/**
	 * Include symbol keys
	 */
	includeSymbolKeys?: boolean;

	/**
	 * Include non-enumerable keys
	 */
	includeNonEnumerable?: boolean;

	/**
	 * Include keys from the prototype chain
	 */
	includePrototypeChain?: boolean;
};

/**
 *
 */
export type ObjectKey = {
	property: string | symbol;
	prototype: unknown;
	nonEnumerable?: boolean;
};

/**
 * Get the keys of an object according to the specified options
 *
 * @param object The object to get the keys from
 * @param options The options for getting the keys
 * @returns The keys of the object
 */
export function getObjectKeys(
	object: object,
	options: Required<GetObjectKeysOptions>,
): ObjectKey[] {
	const keys: ObjectKey[] = [];

	keys.push(
		...Object.keys(object).map((key) => ({ property: key, prototype: object })),
	);

	if (options.includeNonEnumerable) {
		const allKeys = Object.getOwnPropertyNames(object);
		const enumerableKeys = new Set<string>(Object.keys(object));
		const nonEnumerableKeys = allKeys.filter((key) => !enumerableKeys.has(key));
		keys.push(
			...nonEnumerableKeys.map((key) => ({
				property: key,
				prototype: object,
				nonEnumerable: true,
			})),
		);
	}

	if (options.includeSymbolKeys) {
		keys.push(
			...Object.getOwnPropertySymbols(object).map((key) => ({
				property: key,
				prototype: object,
			})),
		);
	}

	if (options.includePrototypeChain) {
		let proto = Object.getPrototypeOf(object);
		while (proto && proto !== Object.prototype) {
			keys.push(
				...getObjectKeys(proto, { ...options, includePrototypeChain: false }),
			);
			proto = Object.getPrototypeOf(proto);
		}
	}

	return keys;
}
