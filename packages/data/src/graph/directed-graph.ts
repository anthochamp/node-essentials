import { DefinedValue } from "@ac-kit/core";

import { IDirectedGraph } from "./idirected-graph.js";

/**
 * A directed graph held as two sparse adjacency lists, one per direction.
 *
 * Keeping both is what makes `inNeighbors`/`inDegree` O(1) rather than a scan
 * of every node's out-edges; the cost is a second `Map` entry per edge. Labels
 * live on the out-adjacency and are mirrored into the in-adjacency.
 *
 * `addEdge(a, b)` adds `a → b` only. `a → b` and `b → a` are distinct edges
 * that may carry different labels, and `edgeCount()` counts each.
 *
 * `neighbors`/`degree` are inherited from `IGraph` and resolve the directed way
 * round: **`neighbors` is the out-neighbors** — what a traversal follows —
 * while **`degree` is `inDegree + outDegree`**, the graph-theoretic degree. Use
 * `outNeighbors`/`outDegree` explicitly wherever that distinction matters to a
 * reader.
 *
 * Time complexity: O(1) for every node and edge operation; O(degree) to delete
 * a node. Space is O(nodes + 2·edges).
 *
 * Nodes are compared by `SameValueZero`, native `Map` semantics.
 *
 * @template N The node type.
 * @template E The edge label type. `void` for an unlabeled graph, in which case
 *   `addEdge`'s third argument may be omitted.
 */
export class DirectedGraph<
	N,
	E extends DefinedValue | void = void,
> implements IDirectedGraph<N, E> {
	private readonly outgoing = new Map<N, Map<N, E>>();
	private readonly incoming = new Map<N, Map<N, E>>();
	private edges_ = 0;

	constructor(nodes?: Iterable<N>) {
		if (nodes) {
			this.addNodes(nodes);
		}
	}

	/** O(1). */
	nodeCount(): number {
		return this.outgoing.size;
	}

	/** O(1). `a → b` and `b → a` count as two. */
	edgeCount(): number {
		return this.edges_;
	}

	/** O(1). A node already present keeps its edges. */
	addNode(node: N): void {
		if (!this.outgoing.has(node)) {
			this.outgoing.set(node, new Map());
			this.incoming.set(node, new Map());
		}
	}

	/** O(m) in the number of nodes. */
	addNodes(nodes: Iterable<N>): void {
		for (const node of nodes) {
			this.addNode(node);
		}
	}

	/** Removes `node` and every edge into or out of it. O(degree). */
	deleteNode(node: N): boolean {
		const out = this.outgoing.get(node);
		const incoming = this.incoming.get(node);

		if (out === undefined || incoming === undefined) {
			return false;
		}

		for (const target of out.keys()) {
			if (target !== node) {
				this.incoming.get(target)?.delete(node);
			}
			this.edges_--;
		}

		for (const source of incoming.keys()) {
			// A self-loop was already counted by the out-edge pass above.
			if (source !== node) {
				this.outgoing.get(source)?.delete(node);
				this.edges_--;
			}
		}

		this.outgoing.delete(node);
		this.incoming.delete(node);

		return true;
	}

	/** O(1). */
	hasNode(node: N): boolean {
		return this.outgoing.has(node);
	}

	/** In first-insertion order. */
	nodes(): IterableIterator<N> {
		return this.outgoing.keys();
	}

	/**
	 * Adds the directed edge `from → to`, creating either endpoint if it is
	 * unknown. Re-adding an existing edge replaces its label. O(1).
	 */
	addEdge(from: N, to: N, label: E): void {
		this.addNode(from);
		this.addNode(to);

		const out = this.outgoing.get(from) as Map<N, E>;

		if (!out.has(to)) {
			this.edges_++;
		}

		out.set(to, label);
		(this.incoming.get(to) as Map<N, E>).set(from, label);
	}

	/** O(1). Directed: this does not touch `to → from`. */
	deleteEdge(from: N, to: N): boolean {
		const out = this.outgoing.get(from);

		if (out === undefined || !out.has(to)) {
			return false;
		}

		out.delete(to);
		this.incoming.get(to)?.delete(from);
		this.edges_--;

		return true;
	}

	/** O(1). Directed: `hasEdge(a, b)` says nothing about `b → a`. */
	hasEdge(from: N, to: N): boolean {
		return this.outgoing.get(from)?.has(to) ?? false;
	}

	/**
	 * O(1).
	 *
	 * @returns The label of `from → to`, or `undefined` when there is no such
	 *   edge.
	 */
	edgeLabel(from: N, to: N): E | undefined {
		return this.outgoing.get(from)?.get(to);
	}

	/** Every directed edge, grouped by source. */
	*edges(): IterableIterator<readonly [N, N, E]> {
		for (const [from, targets] of this.outgoing) {
			for (const [to, label] of targets) {
				yield [from, to, label];
			}
		}
	}

	/** The out-neighbors — what a traversal follows. See the class note. */
	neighbors(node: N): IterableIterator<N> {
		return this.outNeighbors(node);
	}

	/** `inDegree + outDegree`. A self-loop contributes to both. O(1). */
	degree(node: N): number {
		return this.inDegree(node) + this.outDegree(node);
	}

	/** Nodes with an edge into `node`. Empty for an unknown node. */
	*inNeighbors(node: N): IterableIterator<N> {
		const sources = this.incoming.get(node);

		if (sources !== undefined) {
			yield* sources.keys();
		}
	}

	/** Nodes `node` has an edge to. Empty for an unknown node. */
	*outNeighbors(node: N): IterableIterator<N> {
		const targets = this.outgoing.get(node);

		if (targets !== undefined) {
			yield* targets.keys();
		}
	}

	/** O(1). */
	inDegree(node: N): number {
		return this.incoming.get(node)?.size ?? 0;
	}

	/** O(1). */
	outDegree(node: N): number {
		return this.outgoing.get(node)?.size ?? 0;
	}
}
