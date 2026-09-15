import { DefinedValue } from "@ac-kit/core";
import { PriorityQueue } from "@ac-kit/data";

/** How a caller's graph is expanded, weighted and tested. */
export type GraphSearchTraits<TNode> = {
	/** Returns the nodes reachable in one step from `node`. */
	neighboursOf: (node: TNode) => Iterable<TNode>;

	/** Whether `node` is the node being searched for. */
	isGoal: (node: TNode) => boolean;

	/**
	 * Cost of the edge from `from` to `to`. Must be non-negative — a negative
	 * edge invalidates the "first settled is cheapest" property every algorithm
	 * here relies on. Defaults to `1`, which makes cost equal hop count.
	 */
	costOf?: (from: TNode, to: TNode) => number;

	/**
	 * Estimated remaining cost from `node` to a goal. Must never overestimate, or
	 * the path found is not guaranteed to be the cheapest. Defaults to `0`, which
	 * reduces {@link aStar} to Dijkstra's algorithm exactly.
	 */
	heuristicOf?: (node: TNode) => number;

	/**
	 * Identity for a node, so two structurally equal nodes are recognised as one.
	 * Defaults to the node itself, which is right when nodes are interned or
	 * primitive.
	 */
	keyOf?: (node: TNode) => unknown;
};

/** A route found by a graph search, and what it costs to walk it. */
export type GraphPath<TNode> = {
	/** The nodes from the start to the goal, both included. */
	path: readonly TNode[];

	/** Total of `costOf` across the path's edges. */
	cost: number;
};

/** Queued node plus the cost it was queued with, so stale entries are skippable. */
type Frontier_<TNode> = {
	node: TNode;
	gScore: number;
};

/**
 * Best-first graph search, ordered by whatever `priorityOf` makes of the cost
 * so far and the estimate remaining. Lower priority is explored first.
 *
 * Time complexity: O((V + E) log V) — every edge can queue one entry, and a
 * heap operation is logarithmic.
 */
export function searchByPriority<TNode extends DefinedValue>(
	start: TNode,
	traits: GraphSearchTraits<TNode>,
	priorityOf: (gScore: number, heuristic: number) => number,
): GraphPath<TNode> | null {
	const {
		neighboursOf,
		isGoal,
		costOf = () => 1,
		heuristicOf = () => 0,
		keyOf = (node) => node,
	} = traits;

	const bestCost = new Map<unknown, number>([[keyOf(start), 0]]);
	const cameFrom = new Map<unknown, TNode>();

	const frontier = new PriorityQueue<Frontier_<TNode>, number>();
	frontier.insert(priorityOf(0, heuristicOf(start)), {
		node: start,
		gScore: 0,
	});

	while (frontier.count() > 0) {
		const entry = frontier.extract()!;
		const key = keyOf(entry.node);

		// A cheaper route to this node was queued after this entry was.
		if (entry.gScore > (bestCost.get(key) ?? Infinity)) {
			continue;
		}

		if (isGoal(entry.node)) {
			return {
				path: reconstructPath_(cameFrom, keyOf, entry.node),
				cost: entry.gScore,
			};
		}

		for (const next of neighboursOf(entry.node)) {
			const nextKey = keyOf(next);
			const gScore = entry.gScore + costOf(entry.node, next);

			if (gScore >= (bestCost.get(nextKey) ?? Infinity)) {
				continue;
			}

			bestCost.set(nextKey, gScore);
			cameFrom.set(nextKey, entry.node);
			frontier.insert(priorityOf(gScore, heuristicOf(next)), {
				node: next,
				gScore,
			});
		}
	}

	return null;
}

function reconstructPath_<TNode extends DefinedValue>(
	cameFrom: ReadonlyMap<unknown, TNode>,
	keyOf: (node: TNode) => unknown,
	goal: TNode,
): TNode[] {
	const path = [goal];

	let previous = cameFrom.get(keyOf(goal));
	while (previous !== undefined) {
		path.push(previous);
		previous = cameFrom.get(keyOf(previous));
	}

	return path.reverse();
}
