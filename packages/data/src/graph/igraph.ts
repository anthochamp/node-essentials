import { DefinedValue } from "@ac-kit/core";

/**
 * An undirected graph over nodes of type `N`, with optional edge labels `E`.
 *
 * Edge weights stay a caller-supplied label; the ordering used by a weighted
 * algorithm belongs to the algorithm implementation, not to this
 * representation.
 */
export interface IGraph<N, E extends DefinedValue | void = void> {
	nodeCount(): number;
	edgeCount(): number;
	addNode(node: N): void;
	addNodes(nodes: Iterable<N>): void;
	deleteNode(node: N): boolean;
	hasNode(node: N): boolean;
	nodes(): IterableIterator<N>;

	addEdge(from: N, to: N, label: E): void;
	deleteEdge(from: N, to: N): boolean;
	hasEdge(from: N, to: N): boolean;
	edgeLabel(from: N, to: N): E | undefined;
	edges(): IterableIterator<readonly [N, N, E]>;

	neighbors(node: N): IterableIterator<N>;
	degree(node: N): number;
}
