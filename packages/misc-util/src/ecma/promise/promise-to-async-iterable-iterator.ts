/**
 * Converts a promise to an async iterable iterator that yields the resolved value once.
 *
 * @param promise The promise to convert.
 * @returns An async iterable iterator that yields the resolved value of the promise once.
 */
export function promiseValueToAsyncIterableIterator<T>(
	promise: PromiseLike<T>,
): AsyncIterableIterator<T> {
	let done = false;
	return {
		async next() {
			// biome-ignore lint/nursery/noUnnecessaryConditions: false positive
			if (done) {
				return { value: undefined, done: true };
			}

			done = true;
			return { value: await promise, done: false };
		},
		[Symbol.asyncIterator]() {
			return this;
		},
	};
}
