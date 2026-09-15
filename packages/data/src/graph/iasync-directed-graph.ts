import { DefinedValue } from "@ac-kit/core";

import { IAsyncGraph } from "./iasync-graph.js";

/** The async-backed sibling of {@link IDirectedGraph}. */
export interface IAsyncDirectedGraph<
	N,
	E extends DefinedValue | void = void,
> extends IAsyncGraph<N, E> {
	inNeighbors(node: N, signal?: AbortSignal): AsyncIterableIterator<N>;
	outNeighbors(node: N, signal?: AbortSignal): AsyncIterableIterator<N>;
	inDegree(node: N, signal?: AbortSignal): Promise<number>;
	outDegree(node: N, signal?: AbortSignal): Promise<number>;
}
