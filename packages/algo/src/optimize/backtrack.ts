import { DefinedValue } from "@ac-kit/core";

import {
	dfs,
	DfsWalkContinue,
	DfsWalkSkipChildren,
	DfsWalkStop,
} from "../graph/dfs.js";

/** Returned when the search gave up on a branch rather than exhausting it. */
export const BacktrackExhausted: unique symbol = Symbol("BacktrackExhausted");

export type BacktrackResult = boolean | typeof BacktrackExhausted;

/** How a caller's state space is expanded, mutated and tested. */
export type BacktrackTraits<TState> = {
	/** Expands a state into the candidates to try from it. */
	candidatesOf: (state: TState | undefined) => readonly TState[];

	/** Mutates the caller's world to reflect having chosen `state`. */
	apply: (state: TState) => void;

	/** Reverses {@link BacktrackTraits.apply} when a branch is abandoned. */
	undo: (state: TState) => void;

	/** Whether `state` is an acceptable solution. */
	isGoal: (state: TState) => boolean;

	/** Whether `state` is a dead end that should not be expanded. */
	isExhausted?: (state: TState) => boolean;
};

/**
 * Depth-first search over a mutable state space, restoring the caller's state
 * on the way back out of every abandoned branch.
 *
 * Unlike {@link dfs}, which only reads a structure, this owns an apply/undo
 * pair: the caller keeps one mutable world, `apply` advances it into a
 * candidate and `undo` rewinds it, so no state is ever copied. That is what
 * makes it the shape constraint problems (sudoku, N-queens, packing) need.
 *
 * Time complexity: O(b^d) in the branching factor and depth — this is an
 * exhaustive search, bounded only by `isGoal` and `isExhausted`.
 *
 * @param initialState - The state to search from, or `undefined` to start from
 *   whatever `candidatesOf(undefined)` yields.
 * @param traits - How to expand, mutate and test a state.
 * @returns `true` if a goal state was found, `false` if the space was exhausted
 *   without one, or {@link BacktrackExhausted} if a branch reported itself
 *   exhausted first.
 */
export function backtrack<TState extends DefinedValue>(
	initialState: TState | undefined,
	traits: BacktrackTraits<TState>,
): BacktrackResult {
	const { candidatesOf, apply, undo, isGoal, isExhausted } = traits;

	let outcome: BacktrackResult = false;

	// `dfs` walks `TState | undefined` so the root can be the empty state, which
	// has no candidate of its own but does have successors.
	const root = initialState;

	dfs<TState | undefined>(root, {
		childrenOf: (state) => candidatesOf(state),

		onEnter: (state) => {
			if (state === undefined) {
				return DfsWalkContinue;
			}

			if (state !== root) {
				apply(state);
			}

			if (isGoal(state)) {
				outcome = true;
				return DfsWalkStop;
			}

			if (isExhausted?.(state) === true) {
				outcome = BacktrackExhausted;
				return DfsWalkSkipChildren;
			}

			return DfsWalkContinue;
		},

		onExit: (state) => {
			if (state !== undefined && state !== root && outcome !== true) {
				undo(state);
			}
		},
	});

	return outcome;
}
