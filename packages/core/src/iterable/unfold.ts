import type { Callable } from "../types/callable.js";

/**
 * Generates a sequence from a seed, one step at a time — the dual of `reduce`,
 * which collapses a sequence into a single value.
 *
 * `next` returns the value to yield paired with the state to carry forward, or
 * `undefined` to stop. `range` is one instance of this shape, and is kept
 * separate because a counter deserves a name rather than a closure.
 *
 * Time complexity: O(1) per element, plus whatever `next` costs. Nothing is
 * buffered, and a `next` that never stops yields forever.
 *
 * @param seed The initial state.
 * @param next Receives the current state and returns `[value, nextState]`, or
 *   `undefined` to end the sequence.
 * @returns An iterator over the generated values.
 */
export function* unfold<S, T>(
	seed: S,
	next: Callable<[S], readonly [value: T, state: S] | undefined>,
): IterableIterator<T> {
	let state = seed;

	while (true) {
		const step = next(state);

		if (step === undefined) {
			return;
		}

		yield step[0];
		state = step[1];
	}
}
