export {};

declare global {
	interface ObjectConstructor {
		/**
		 * A better typed version of Object.entries which preserves key types.
		 *
		 * @param o The object to extract entries from.
		 * @returns An array of key-value pairs from the object.
		 */
		entries<T, K extends PropertyKey>(o: Record<K, T> | ArrayLike<T>): [K, T][];

		/**
		 * A better typed version of Object.keys which preserves key types.
		 *
		 * @param o The object to extract keys from.
		 * @returns An array of keys from the object.
		 */
		keys<T, K extends PropertyKey>(o: Record<K, T> | ArrayLike<T>): K[];

		/**
		 * A better typed version of Object.fromEntries which preserves key types.
		 *
		 * @param entries An iterable of key-value pairs to convert into an object.
		 * @returns An object constructed from the key-value pairs.
		 */
		fromEntries<T, K extends PropertyKey>(
			entries: Iterable<readonly [K, T]>,
		): Record<K, T>;
	}
}
