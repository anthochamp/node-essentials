import { describe, expect, it } from "vitest";

import { aStar } from "./a-star.js";
import { bestFirstSearch } from "./best-first-search.js";

/**
 * A weighted grid where every cell is reachable from its four neighbours. Cells
 * are `"row,col"` strings so identity is free.
 */
type Grid = {
	readonly rows: number;
	readonly cols: number;
	readonly blocked: ReadonlySet<string>;
};

const at = (row: number, col: number) => `${row},${col}`;

const neighboursIn =
	(grid: Grid) =>
	(node: string): string[] => {
		const [row, col] = node.split(",").map(Number) as [number, number];

		return (
			[
				[row - 1, col],
				[row + 1, col],
				[row, col - 1],
				[row, col + 1],
			] as const
		)
			.filter(
				([r, c]) =>
					r >= 0 &&
					c >= 0 &&
					r < grid.rows &&
					c < grid.cols &&
					!grid.blocked.has(at(r, c)),
			)
			.map(([r, c]) => at(r, c));
	};

/** Breadth-first shortest hop count — an independent reference for unit costs. */
function bruteForceHops(
	grid: Grid,
	start: string,
	goal: string,
): number | null {
	const neighbours = neighboursIn(grid);
	const seen = new Set([start]);
	let frontier = [start];
	let distance = 0;

	while (frontier.length > 0) {
		if (frontier.includes(goal)) {
			return distance;
		}

		const next: string[] = [];
		for (const node of frontier) {
			for (const neighbour of neighbours(node)) {
				if (!seen.has(neighbour)) {
					seen.add(neighbour);
					next.push(neighbour);
				}
			}
		}

		frontier = next;
		distance++;
	}

	return null;
}

const manhattanTo = (goal: string) => (node: string) => {
	const [row, col] = node.split(",").map(Number) as [number, number];
	const [goalRow, goalCol] = goal.split(",").map(Number) as [number, number];

	return Math.abs(row - goalRow) + Math.abs(col - goalCol);
};

describe("aStar", () => {
	const open: Grid = { rows: 5, cols: 5, blocked: new Set() };

	it("finds the goal and returns a contiguous path including both ends", () => {
		const result = aStar("0,0", {
			neighboursOf: neighboursIn(open),
			isGoal: (node) => node === "4,4",
			heuristicOf: manhattanTo("4,4"),
		});

		expect(result).not.toBeNull();
		expect(result?.path[0]).toBe("0,0");
		expect(result?.path.at(-1)).toBe("4,4");
		expect(result?.path).toHaveLength(result!.cost + 1);
	});

	it("returns the start alone when the start is already a goal", () => {
		const result = aStar("2,2", {
			neighboursOf: neighboursIn(open),
			isGoal: (node) => node === "2,2",
		});

		expect(result).toEqual({ path: ["2,2"], cost: 0 });
	});

	it("returns null when no goal is reachable", () => {
		const walled: Grid = {
			rows: 3,
			cols: 3,
			blocked: new Set(["1,0", "1,1", "1,2"]),
		};

		const result = aStar("0,0", {
			neighboursOf: neighboursIn(walled),
			isGoal: (node) => node === "2,2",
		});

		expect(result).toBeNull();
	});

	it("matches a breadth-first reference on random obstacle grids", () => {
		for (let round = 0; round < 100; round++) {
			const blocked = new Set<string>();
			for (let row = 0; row < 6; row++) {
				for (let col = 0; col < 6; col++) {
					if ((row !== 0 || col !== 0) && Math.random() < 0.25) {
						blocked.add(at(row, col));
					}
				}
			}
			blocked.delete("5,5");

			const grid: Grid = { rows: 6, cols: 6, blocked };
			const expected = bruteForceHops(grid, "0,0", "5,5");

			const result = aStar("0,0", {
				neighboursOf: neighboursIn(grid),
				isGoal: (node) => node === "5,5",
				heuristicOf: manhattanTo("5,5"),
			});

			expect(result?.cost ?? null).toBe(expected);
		}
	});

	it("is Dijkstra when no heuristic is given, and honours edge costs", () => {
		// A cheap detour beats the single expensive direct edge.
		const edges: Record<string, readonly string[]> = {
			start: ["direct", "detourA"],
			direct: ["goal"],
			detourA: ["detourB"],
			detourB: ["goal"],
			goal: [],
		};
		const cost: Record<string, number> = {
			"start->direct": 10,
			"direct->goal": 10,
			"start->detourA": 1,
			"detourA->detourB": 1,
			"detourB->goal": 1,
		};

		const result = aStar<string>("start", {
			neighboursOf: (node) => edges[node] ?? [],
			isGoal: (node) => node === "goal",
			costOf: (from, to) => cost[`${from}->${to}`] ?? Infinity,
		});

		expect(result?.cost).toBe(3);
		expect(result?.path).toEqual(["start", "detourA", "detourB", "goal"]);
	});

	it("uses keyOf to treat structurally equal nodes as one", () => {
		type Cell = { readonly row: number; readonly col: number };

		const result = aStar<Cell>(
			{ row: 0, col: 0 },
			{
				// Fresh objects every call: without keyOf this never terminates.
				neighboursOf: ({ row, col }) =>
					[
						{ row: row + 1, col },
						{ row, col: col + 1 },
					].filter((cell) => cell.row <= 2 && cell.col <= 2),
				isGoal: ({ row, col }) => row === 2 && col === 2,
				keyOf: ({ row, col }) => `${row},${col}`,
			},
		);

		expect(result?.cost).toBe(4);
	});
});

describe("bestFirstSearch", () => {
	const open: Grid = { rows: 5, cols: 5, blocked: new Set() };

	it("reaches the goal when the heuristic points at it", () => {
		const result = bestFirstSearch("0,0", {
			neighboursOf: neighboursIn(open),
			isGoal: (node) => node === "4,4",
			heuristicOf: manhattanTo("4,4"),
		});

		expect(result?.path[0]).toBe("0,0");
		expect(result?.path.at(-1)).toBe("4,4");
	});

	it("returns null when no goal is reachable", () => {
		const walled: Grid = {
			rows: 3,
			cols: 3,
			blocked: new Set(["1,0", "1,1", "1,2"]),
		};

		const result = bestFirstSearch("0,0", {
			neighboursOf: neighboursIn(walled),
			isGoal: (node) => node === "2,2",
			heuristicOf: manhattanTo("2,2"),
		});

		expect(result).toBeNull();
	});

	it("may return a costlier path than aStar, which is the trade it makes", () => {
		// The greedy heuristic dives straight at the goal down the expensive edge.
		const edges: Record<string, readonly string[]> = {
			start: ["direct", "detourA"],
			direct: ["goal"],
			detourA: ["detourB"],
			detourB: ["goal"],
			goal: [],
		};
		const cost: Record<string, number> = {
			"start->direct": 10,
			"direct->goal": 10,
			"start->detourA": 1,
			"detourA->detourB": 1,
			"detourB->goal": 1,
		};
		const hopsToGoal: Record<string, number> = {
			start: 3,
			direct: 1,
			detourA: 2,
			detourB: 1,
			goal: 0,
		};

		const traits = {
			neighboursOf: (node: string) => edges[node] ?? [],
			isGoal: (node: string) => node === "goal",
			costOf: (from: string, to: string) => cost[`${from}->${to}`] ?? Infinity,
			heuristicOf: (node: string) => hopsToGoal[node] ?? Infinity,
		};

		const greedy = bestFirstSearch("start", traits);
		const optimal = aStar("start", traits);

		expect(greedy?.cost).toBe(20);
		expect(optimal?.cost).toBe(3);
	});
});
