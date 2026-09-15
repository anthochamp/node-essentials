import { GridCoord2 } from "./grid-coord2.js";
import { GridRect2 } from "./grid-rect2.js";
import { GridSize2 } from "./grid-size2.js";
import { StripGrid2 } from "./strip-grid2.js";

export type FrontierMove<T> = {
	rect: GridRect2;
	item: T;
	index: number;
};

export type FrontierTiling<T> = {
	moves: FrontierMove<T>[];
	usedIndices: Set<number>;
};

export type FrontierTilingOptions = {
	lookahead?: number;
	maxComponentRows?: number;
	maxNodes?: number;
	maxSolutions?: number;
	/**
	 * Called after the search finishes. Receives the number of nodes explored and
	 * solutions found.
	 */
	onComplete?: ((stats: { nodes: number; solutions: number }) => void) | null;
};

const DEFAULT_OPTIONS_: Required<FrontierTilingOptions> = {
	lookahead: 10,
	maxComponentRows: 10,
	maxNodes: 10000,
	maxSolutions: 1,
	onComplete: null,
};

/**
 * Finds all possible tilings of the given items in the given grid, starting
 * from the first empty cell.
 *
 * The search is depth-first and will stop either: - when the maximum number of
 * component rows is reached, - when the maximum number of solutions is reached,
 * or - when the maximum number of nodes is reached.
 */
export function findFrontierTilings<T>(
	grid: StripGrid2<T>,
	items: readonly T[],
	getSize: (item: T) => GridSize2,
	getDedupeKey: (item: T) => string,
	getMoveScore: (move: FrontierMove<T>) => number,
	options?: FrontierTilingOptions,
): FrontierTiling<T>[] {
	const opts: Required<FrontierTilingOptions> = {
		lookahead: options?.lookahead ?? DEFAULT_OPTIONS_.lookahead,
		maxComponentRows:
			options?.maxComponentRows ?? DEFAULT_OPTIONS_.maxComponentRows,
		maxNodes: options?.maxNodes ?? DEFAULT_OPTIONS_.maxNodes,
		maxSolutions: options?.maxSolutions ?? DEFAULT_OPTIONS_.maxSolutions,
		onComplete: options?.onComplete ?? DEFAULT_OPTIONS_.onComplete,
	};

	const used = Array.from<boolean>({ length: items.length }).fill(false);
	const moves: FrontierMove<T>[] = [];
	const solutions: FrontierTiling<T>[] = [];
	let nodes = 0;

	const start = grid.getFirstEmpty();

	// The end row of the component is the maximum row of any placed item in the current component.
	let componentEndRow = start.row;

	function search(): void {
		if (solutions.length >= opts.maxSolutions) {
			return;
		}

		const next = grid.getFirstEmpty();

		// If the next empty cell is after the end of the component, we have a valid solution.
		if (moves.length > 0 && next.row >= componentEndRow) {
			solutions.push({
				moves: moves.map((move) => ({ ...move })),
				usedIndices: new Set(moves.map((move) => move.index)),
			});
			return;
		}

		// If the next empty cell is too far down, or if we have explored too many nodes, stop searching.
		if (
			next.row - start.row >= opts.maxComponentRows ||
			++nodes > opts.maxNodes
		) {
			return;
		}

		// Explore all candidate moves from the current frontier, sorted by score.
		for (const move of getCandidates_(
			grid,
			items,
			used,
			next,
			getSize,
			getDedupeKey,
			getMoveScore,
			opts.lookahead,
		)) {
			used[move.index] = true;
			moves.push(move);
			grid.placeRect(move.rect, move.item);
			const previousEndRow = componentEndRow;
			// Update the end row of the component to include the newly placed item.
			componentEndRow = Math.max(
				componentEndRow,
				move.rect.start.row + move.rect.span.rows,
			);

			search();

			componentEndRow = previousEndRow;
			grid.clearRect(move.rect);
			moves.pop();
			used[move.index] = false;

			if (solutions.length >= opts.maxSolutions) {
				return;
			}
		}
	}

	search();

	opts.onComplete?.({ nodes, solutions: solutions.length });
	return solutions;
}

function* getCandidates_<T>(
	grid: StripGrid2<T>,
	items: readonly T[],
	used: readonly boolean[],
	coord: GridCoord2,
	getSize: (item: T) => GridSize2,
	getDedupeKey: (item: T) => string,
	getMoveScore: (move: FrontierMove<T>) => number,
	lookahead: number,
): IterableIterator<FrontierMove<T>> {
	const candidates: Array<FrontierMove<T>> = [];
	const tried = new Set<string>();

	for (let index = 0; index < Math.min(items.length, lookahead); index++) {
		if (used[index]) {
			continue;
		}

		const item = items[index]!;

		const key = getDedupeKey(item);
		if (tried.has(key)) {
			continue;
		}
		tried.add(key);

		const rect: GridRect2 = {
			start: coord,
			span: getSize(item),
		};

		if (grid.canPlaceRect(rect)) {
			candidates.push({ item, index, rect });
		}
	}

	yield* candidates.sort((a, b) => getMoveScore(a) - getMoveScore(b));
}
