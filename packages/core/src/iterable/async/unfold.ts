import type { MaybeAsyncCallable } from "../../types/callable.js";

/**
 * Generates a sequence from a seed, one step at a time — the dual of `reduce`.
 *
 * The async counterpart of `unfold`, and the shape a paginated API has: the
 * state is the cursor, and `next` resolves to the page plus the cursor that
 * follows it, or `undefined` when there are no more.
 *
 * Time complexity: O(1) per element, plus whatever `next` costs.
 *
 * @param seed The initial state.
 * @param next Receives the current state and resolves to `[value, nextState]`,
 *   or `undefined` to end the sequence.
 * @returns An iterator over the generated values.
 */
export async function* unfoldAsync<S, T>(
	seed: S,
	next: MaybeAsyncCallable<[S], readonly [value: T, state: S] | undefined>,
): AsyncIterableIterator<T> {
	let state = seed;

	while (true) {
		const step = await next(state);

		if (step === undefined) {
			return;
		}

		yield step[0];
		state = step[1];
	}
}
