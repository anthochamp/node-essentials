import { Callable } from "@ac-kit/core";

export type ShuffleAlgorithm = "fisherYates" | "sattolo";

export type ShuffleOptions = {
	/**
	 * A random number generator function that returns a number in the range [0,
	 * 1).
	 *
	 * Defaults to `Math.random` if not provided.
	 */
	rand?: Callable<[], number>;

	/**
	 * The shuffle algorithm to use.
	 *
	 * Defaults to "fisherYates".
	 */
	algorithm?: ShuffleAlgorithm;
};

/**
 * Shuffles `items` using the Fisher-Yates algorithm and returns a new shuffled
 * array.
 *
 * Time complexity: O(n), one swap per element. Takes an array rather than an
 * `Iterable` because the swap step indexes freely, so a stream would have to be
 * materialized anyway.
 *
 * @param items - The items to shuffle. Not modified; a new array is returned.
 * @param options - Optional shuffle options.
 * @returns A new array containing the shuffled elements of the input.
 */
export function shuffle<T>(items: readonly T[], options?: ShuffleOptions): T[] {
	const rand = options?.rand ?? Math.random;
	const algorithm = options?.algorithm ?? "fisherYates";

	const randomize = (i: number): number => {
		if (algorithm === "sattolo") {
			return Math.floor(rand() * i);
		} else {
			return Math.floor(rand() * (i + 1));
		}
	};

	const out = items.slice();

	for (let i = out.length - 1; i > 0; i--) {
		const j = randomize(i);

		const tmp = out[i]!;
		out[i] = out[j]!;
		out[j] = tmp;
	}

	return out;
}
