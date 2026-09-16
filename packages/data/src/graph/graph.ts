import { DefinedValue } from "@ac-kit/core";

import type { IGraph } from "./igraph.js";

/**
 * An undirected graph held as a sparse adjacency list.
 *
 * The backing is `Map<N, Map<N, E>>` — an adjacency list, as the sparse case
 * this package favours wants, rather than an adjacency matrix that would cost
 * O(n²) regardless of how few edges exist. The inner `Map` rather than a set is
 * what carries the edge label and keeps `hasEdge`/`edgeLabel` O(1).
 *
 * An edge is stored under both endpoints, so `addEdge(a, b)` makes `b` a
 * neighbor of `a` and `a` a neighbor of `b`; `edgeCount()` still counts it
 * once. A self-loop is stored once and counts once toward `degree`.
 *
 * Edge weights are just labels here. The ordering a weighted algorithm needs
 * belongs to that algorithm (`@ac-kit/algo`), not to the representation — which
 * is why this package carries no numeric dependency.
 *
 * Time complexity: O(1) for every node and edge operation; O(degree) to delete
 * a node, since each neighbor's own adjacency has to drop it. Space is O(nodes
 *
 * - Edges).
 *
 * Nodes are compared by `SameValueZero`, native `Map` semantics.
 *
 * @template N The node type.
 * @template E The edge label type. `void` for an unlabeled graph, in which case
 *   `addEdge`'s third argument may be omitted.
 */
export class Graph<N, E extends DefinedValue | void = void> implements IGraph<
	N,
	E
> {
	private readonly adjacency = new Map<N, Map<N, E>>();
	private edges_ = 0;

	constructor(nodes?: Iterable<N>) {
		if (nodes) {
			this.addNodes(nodes);
		}
	}

	/** O(1). */
	nodeCount(): number {
		return this.adjacency.size;
	}

	/** Each undirected edge once, not twice. O(1). */
	edgeCount(): number {
		return this.edges_;
	}

	/** O(1). A node already present keeps its edges. */
	addNode(node: N): void {
		if (!this.adjacency.has(node)) {
			this.adjacency.set(node, new Map());
		}
	}

	/** O(m) in the number of nodes. */
	addNodes(nodes: Iterable<N>): void {
		for (const node of nodes) {
			this.addNode(node);
		}
	}

	/** Removes `node` and every edge touching it. O(degree). */
	deleteNode(node: N): boolean {
		const neighbors = this.adjacency.get(node);

		if (neighbors === undefined) {
			return false;
		}

		for (const neighbor of neighbors.keys()) {
			if (neighbor !== node) {
				this.adjacency.get(neighbor)?.delete(node);
			}

			this.edges_--;
		}

		this.adjacency.delete(node);

		return true;
	}

	/** O(1). */
	hasNode(node: N): boolean {
		return this.adjacency.has(node);
	}

	/** In first-insertion order. */
	nodes(): IterableIterator<N> {
		return this.adjacency.keys();
	}

	/**
	 * Adds an undirected edge, creating either endpoint if it is unknown.
	 * Re-adding an existing edge replaces its label rather than duplicating it.
	 * O(1).
	 */
	addEdge(from: N, to: N, label: E): void {
		this.addNode(from);
		this.addNode(to);

		const fromNeighbors = this.adjacency.get(from) as Map<N, E>;

		if (!fromNeighbors.has(to)) {
			this.edges_++;
		}

		fromNeighbors.set(to, label);
		(this.adjacency.get(to) as Map<N, E>).set(from, label);
	}

	/** O(1). */
	deleteEdge(from: N, to: N): boolean {
		const fromNeighbors = this.adjacency.get(from);

		if (fromNeighbors === undefined || !fromNeighbors.has(to)) {
			return false;
		}

		fromNeighbors.delete(to);
		this.adjacency.get(to)?.delete(from);
		this.edges_--;

		return true;
	}

	/** O(1). Symmetric: the edge is undirected. */
	hasEdge(from: N, to: N): boolean {
		return this.adjacency.get(from)?.has(to) ?? false;
	}

	/**
	 * O(1).
	 *
	 * @returns The label, or `undefined` when there is no such edge. An unlabeled
	 *   graph (`E = void`) returns `undefined` either way — ask `hasEdge`
	 *   instead.
	 */
	edgeLabel(from: N, to: N): E | undefined {
		return this.adjacency.get(from)?.get(to);
	}

	/** Each undirected edge once, oriented as first encountered. */
	*edges(): IterableIterator<readonly [N, N, E]> {
		const seen = new Set<N>();

		for (const [from, neighbors] of this.adjacency) {
			for (const [to, label] of neighbors) {
				// The other direction is stored too; skip it unless it is a
				// self-loop, which exists only once.
				if (!seen.has(to)) {
					yield [from, to, label];
				}
			}

			seen.add(from);
		}
	}

	/** Empty for an unknown node. */
	*neighbors(node: N): IterableIterator<N> {
		const neighbors = this.adjacency.get(node);

		if (neighbors !== undefined) {
			yield* neighbors.keys();
		}
	}

	/** The number of adjacent nodes; a self-loop counts once. O(1). */
	degree(node: N): number {
		return this.adjacency.get(node)?.size ?? 0;
	}
}
