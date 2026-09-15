/**
 * Represents a key of an object, including the prototype it belongs to and
 * whether it is non-enumerable.
 */
export type ObjectKey = {
	/** The property key, which can be a string or a symbol. */
	property: string | symbol;

	/** The prototype object that owns the property. */
	prototype: unknown;

	/**
	 * Indicates whether the property is non-enumerable. If `true`, the property
	 * is non-enumerable; if `false` or `undefined`, the property is enumerable.
	 */
	nonEnumerable?: boolean;
};

export type GetObjectKeysOptions = {
	/**
	 * Include symbol keys
	 *
	 * Defaults to false.
	 */
	includeSymbolKeys?: boolean;

	/**
	 * Include non-enumerable keys
	 *
	 * Defaults to false.
	 */
	includeNonEnumerable?: boolean;

	/**
	 * Include keys from the prototype chain
	 *
	 * Defaults to false.
	 */
	includePrototypeChain?: boolean;
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
	options?: GetObjectKeysOptions,
): ObjectKey[] {
	const keys: ObjectKey[] = [];
	collectOwnKeys_(object, options ?? {}, keys);

	if (options?.includePrototypeChain) {
		// One options object for the whole walk: this runs once per node of every
		// traversal, deep merge and deep comparison in the library.
		const ownOnly: GetObjectKeysOptions = {
			...options,
			includePrototypeChain: false,
		};

		let proto = Object.getPrototypeOf(object) as object | null;
		while (proto && proto !== Object.prototype) {
			collectOwnKeys_(proto, ownOnly, keys);
			proto = Object.getPrototypeOf(proto) as object | null;
		}
	}

	return keys;
}

/**
 * Appends the own keys of `object` to `keys`.
 *
 * @param object The object to get the keys from
 * @param options The options for getting the keys
 * @param keys The array to append the keys to
 */
function collectOwnKeys_(
	object: object,
	options: GetObjectKeysOptions,
	keys: ObjectKey[],
): void {
	const enumerableKeys = Object.keys(object);
	for (const key of enumerableKeys) {
		keys.push({ property: key, prototype: object });
	}

	if (options.includeNonEnumerable) {
		const enumerable = new Set<string>(enumerableKeys);
		for (const key of Object.getOwnPropertyNames(object)) {
			if (!enumerable.has(key)) {
				keys.push({ property: key, prototype: object, nonEnumerable: true });
			}
		}
	}

	if (options.includeSymbolKeys) {
		for (const key of Object.getOwnPropertySymbols(object)) {
			keys.push({ property: key, prototype: object });
		}
	}
}
