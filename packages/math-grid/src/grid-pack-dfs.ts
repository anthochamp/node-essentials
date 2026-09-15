import { backtrack, BacktrackExhausted } from "@ac-kit/algo";

import { GridCoord2 } from "./grid-coord2.js";
import { GridSize2 } from "./grid-size2.js";
import { StripGrid2 } from "./strip-grid2.js";

/** Minimum shape that a placeable item must expose. */
export type GridPackItem = {
	span: GridSize2;
};

export type GridPackOptions<T extends GridPackItem> = {
	/**
	 * Assigns a numeric priority weight to a candidate at the current grid
	 * position. Lower weights are tried first. Candidates with equal weight are
	 * tried in the order they appear in `items`.
	 *
	 * @param candidate - The item under consideration.
	 * @param lastPlaced - The most recently placed item, or `null` at the root.
	 * @param remaining - All items not yet placed at this DFS node.
	 */
	classify: (
		candidate: T,
		lastPlaced: T | null,
		remaining: readonly T[],
	) => number;
	/**
	 * Returns a deduplication key for shape-based DFS pruning: only one item per
	 * unique key is expanded at each grid position. Defaults to
	 * `"${cols}x${rows}"`.
	 */
	shapeKey?: (item: T) => string;
	/**
	 * Maximum DFS node expansions per frontier row before drilling a hole. The
	 * counter resets each time the DFS reaches a row it has never visited before,
	 * so this is a per-row limit, not a per-full-search limit.
	 */
	rowBudget?: number;
};

export type GridPackResult<T> = {
	/**
	 * Items successfully placed by the DFS, mapped to their `[row, col]` position
	 * (0-based).
	 */
	place: Map<T, GridCoord2>;
	/**
	 * The occupancy grid after the DFS run. Callers may reuse it to place
	 * remaining (tail) items without overlap.
	 */
	grid: StripGrid2<boolean>;
};

/**
 * Internal move: a candidate item together with the grid position it would
 * occupy.
 */
type Move<T> = { item: T; index: number; coord: GridCoord2 };

/**
 * Packs items into a `W`-column grid using depth-first search with
 * backtracking.
 *
 * Items are placed in reading order (left-to-right, top-to-bottom) starting at
 * the first empty cell. The caller controls candidate ordering through the
 * `classify` weight function. When the node budget is exceeded, the algorithm
 * preserves state at the deepest reached point, drills a hole to fill the
 * remainder of the frontier row, and restarts the DFS from the next row.
 *
 * Items not placed by the DFS are absent from `result.place`. The caller is
 * responsible for placing them (tail placement) using `result.grid`.
 */
export function dfsPackGrid2<T extends GridPackItem>(
	items: T[],
	columnCount: number,
	options: GridPackOptions<T>,
): GridPackResult<T> {
	const {
		classify,
		shapeKey = (it: T) => `${it.span.cols}x${it.span.rows}`,
		rowBudget = 5_000,
	} = options;

	const grid = new StripGrid2<boolean>(columnCount);
	const used = Array.from<boolean>({ length: items.length }).fill(false);
	const place = new Map<T, GridCoord2>();
	let nodes = 0;
	let placedCount = 0;
	let frontierRow = -1;

	const candidatesOf = (move: Move<T> | undefined): readonly Move<T>[] => {
		const coord = grid.getFirstEmpty();

		// Reset the node counter each time the DFS reaches a row it has never
		// visited before. This makes rowBudget a per-row limit: the DFS gets a
		// fresh budget for each new row rather than one budget for the whole search.
		if (coord.row > frontierRow) {
			frontierRow = coord.row;
			nodes = 0;
		}

		const remaining = items.filter((_, i) => !used[i]);
		const triedShapes = new Set<string>();
		const weighted: Array<{ move: Move<T>; weight: number }> = [];

		for (let i = 0; i < items.length; i++) {
			if (used[i]) continue;
			const it = items[i]!;
			const key = shapeKey(it);
			if (triedShapes.has(key)) continue;

			if (!grid.canPlaceRect({ start: coord, span: it.span })) {
				continue;
			}
			triedShapes.add(key);
			const weight = classify(it, move?.item ?? null, remaining);
			weighted.push({ move: { item: it, index: i, coord }, weight });
		}

		weighted.sort((a, b) => a.weight - b.weight);
		return weighted.map((w) => w.move);
	};

	const apply = (move: Move<T>): void => {
		used[move.index] = true;
		placedCount++;
		place.set(move.item, move.coord);
		grid.placeRect({ start: move.coord, span: move.item.span }, true);
	};

	const undo = (move: Move<T>): void => {
		grid.placeRect({ start: move.coord, span: move.item.span }, false);
		place.delete(move.item);
		placedCount--;
		used[move.index] = false;
	};

	const isGoal = (): boolean => placedCount === items.length;

	const isExhausted = (): boolean => {
		if (++nodes > rowBudget) {
			return true;
		}
		return false;
	};

	// Outer loop: run DFS; on BUDGET_EXCEEDED, place/grid/used hold the deepest-
	// reached state (no backtracking). Fill the rest of the frontier row with a
	// hole, reset the budget, and continue from the next row.
	while (placedCount < items.length) {
		nodes = 0;
		const result = backtrack(undefined, {
			candidatesOf,
			apply,
			undo,
			isGoal,
			isExhausted,
		});

		if (result !== BacktrackExhausted) {
			break;
		}

		const firstCoord = grid.getFirstEmpty();
		grid.placeRect(
			{
				start: firstCoord,
				span: { cols: columnCount - firstCoord.col, rows: 1 },
			},
			true,
		);
	}

	return { place, grid };
}
