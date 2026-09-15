import { Callable } from "../types/callable.js";

export type MemoizeOptions<A extends unknown[]> = {
	/**
	 * A function that generates a cache key from the arguments passed to the
	 * memoized function.
	 *
	 * By default, the first argument is used as the cache key.
	 *
	 * Note: If the first argument is not a primitive value, you may want to
	 * provide a custom `keyOf` function that returns a primitive value to avoid
	 * unexpected behavior.
	 *
	 * @param args - The arguments passed to the memoized function.
	 * @returns A primitive value that can be used as a cache key.
	 */
	keyOf?: (args: A) => unknown;
};

export function memoize<A extends unknown[], R>(
	fn: Callable<A, R>,
	options?: MemoizeOptions<A>,
): Callable<A, R> {
	const cache = new Map<unknown, R>();

	const keyOf = options?.keyOf ?? ((args: A) => args[0]);

	return function (...args: A): R {
		const key = keyOf(args);

		if (cache.has(key)) {
			const value = cache.get(key)!;
			cache.delete(key);
			cache.set(key, value);
			return value;
		}

		const result = fn(...args);
		cache.set(key, result);

		return result;
	};
}
