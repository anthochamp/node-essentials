import { DefinedValue } from "@ac-kit/core";

/** How a caller's state space is expanded, scored and tested. */
export type BeamSearchTraits<TState> = {
	/** Expands a state into its successors. Return `[]` for a dead end. */
	nextStatesOf: (state: TState) => readonly TState[];

	/** Scores a state. **Higher is better** — the beam keeps the highest. */
	scoreOf: (state: TState) => number;

	/** Whether a state is a complete, acceptable solution. */
	isGoal: (state: TState) => boolean;

	/**
	 * Whether a state is a dead end to drop from the beam without expanding. Use
	 * `() => false` when `nextStatesOf` returning `[]` already covers it.
	 */
	isTerminal: (state: TState) => boolean;
};

/**
 * Performs a beam search over a state space.
 *
 * Starting from `initialState`, each step expands every live state, then keeps
 * only the top `beamWidth` candidates by score. The search stops on the first
 * goal state in the beam, when no successors are produced, or at `maxDepth`.
 *
 * Time complexity: O(maxDepth · beamWidth · b log(beamWidth · b)) for a
 * branching factor `b` — the sort at each step dominates.
 *
 * @param initialState - Seed state for the search.
 * @param traits - How to expand, score and test a state.
 * @param beamWidth - Maximum number of states kept after each expansion step.
 * @param maxDepth - Maximum number of expansion steps before the search stops.
 * @returns The highest-scoring surviving state, or `undefined` if no states
 *   survive.
 */
export function beamSearch<TState extends DefinedValue>(
	initialState: TState,
	traits: BeamSearchTraits<TState>,
	beamWidth: number,
	maxDepth: number,
): TState | undefined {
	const { nextStatesOf, scoreOf, isGoal, isTerminal } = traits;

	let states = [initialState];

	for (let depth = 0; depth < maxDepth; depth++) {
		if (states.some((state) => isGoal(state))) {
			break;
		}

		const nextStates: TState[] = [];
		for (const state of states) {
			if (isTerminal(state)) {
				// Dead end: drop from beam rather than carrying a stuck state forward.
				continue;
			}
			nextStates.push(...nextStatesOf(state));
		}

		if (nextStates.length === 0) {
			break;
		}

		states = nextStates
			.sort((stateA, stateB) => scoreOf(stateB) - scoreOf(stateA))
			.slice(0, beamWidth);
	}

	return states.sort((stateA, stateB) => scoreOf(stateB) - scoreOf(stateA))[0];
}
