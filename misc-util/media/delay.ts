import type { MaybeAsyncCallable } from "../function/types.js";

/**
 * Delay the execution of a callback function by a specified number of milliseconds.
 */
export async function delay<T, R>(
	delayMs: number,
	callback: MaybeAsyncCallable<T[], R>,
	...args: T[]
): Promise<R> {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			try {
				resolve(callback(...args));
			} catch (error) {
				reject(error);
			}
		}, delayMs);
	});
}
