import { DefinedValue } from "@ac-kit/core";

/** The async-backed sibling of {@link IGraph}. */
export interface IAsyncGraph<N, E extends DefinedValue | void = void> {
	nodeCount(signal?: AbortSignal): Promise<number>;
	edgeCount(signal?: AbortSignal): Promise<number>;
	addNode(node: N, signal?: AbortSignal): Promise<void>;
	addNodes(nodes: Iterable<N>, signal?: AbortSignal): Promise<void>;
	deleteNode(node: N, signal?: AbortSignal): Promise<boolean>;
	hasNode(node: N, signal?: AbortSignal): Promise<boolean>;
	nodes(signal?: AbortSignal): AsyncIterableIterator<N>;

	addEdge(from: N, to: N, label: E, signal?: AbortSignal): Promise<void>;
	deleteEdge(from: N, to: N, signal?: AbortSignal): Promise<boolean>;
	hasEdge(from: N, to: N, signal?: AbortSignal): Promise<boolean>;
	edgeLabel(from: N, to: N, signal?: AbortSignal): Promise<E | undefined>;
	edges(signal?: AbortSignal): AsyncIterableIterator<readonly [N, N, E]>;

	neighbors(node: N, signal?: AbortSignal): AsyncIterableIterator<N>;
	degree(node: N, signal?: AbortSignal): Promise<number>;
}
