import { MaybePromiseLike, type MaybeAsyncCallable } from "@ac-kit/core";

/**
 * Resolve a configuration value that may be a static value or a function
 * returning the value.
 *
 * If it's a function, it will be called with the provided arguments. If it's a
 * static value, it will be returned as-is.
 *
 * This allows configuration options to be defined either as fixed values or as
 * functions that compute the value dynamically.
 *
 * @param configValue The configuration value or function to resolve.
 * @param args Arguments to pass if the configValue is a function.
 * @returns The resolved configuration value, possibly a Promise if async.
 */
export function resolveConfigValue<A extends unknown[], R>(
	configValue: MaybeAsyncCallable<A, R> | R,
	...args: A
): MaybePromiseLike<R> {
	if (typeof configValue === "function") {
		return (configValue as MaybeAsyncCallable<A, R>)(...args);
	}

	return configValue;
}
