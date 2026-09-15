/** Yields `values` from an async generator, one per microtask. */
export async function* asyncOf<T>(
	...values: readonly T[]
): AsyncIterableIterator<T> {
	for (const value of values) {
		await Promise.resolve();
		yield value;
	}
}

/** Yields `1, 2, 3, …` forever, reporting how many were produced. */
export function countedAsync(): {
	source: () => AsyncIterableIterator<number>;
	produced: () => number;
} {
	let produced = 0;

	return {
		source: async function* (): AsyncIterableIterator<number> {
			while (true) {
				produced++;
				await Promise.resolve();
				yield produced;
			}
		},
		produced: () => produced,
	};
}

/** Yields `0 … length - 1`, recording whether the generator was closed. */
export function closableAsync(length: number): {
	source: () => AsyncIterableIterator<number>;
	returned: () => boolean;
} {
	let returned = false;

	return {
		source: async function* (): AsyncIterableIterator<number> {
			try {
				for (let value = 0; value < length; value++) {
					await Promise.resolve();
					yield value;
				}
			} finally {
				returned = true;
			}
		},
		returned: () => returned,
	};
}

/** Collects an async iterable into an array. */
export async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
	const values: T[] = [];

	for await (const value of iterable) {
		values.push(value);
	}

	return values;
}
