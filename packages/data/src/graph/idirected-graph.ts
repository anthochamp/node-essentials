import { DefinedValue } from "@ac-kit/core";

import { IGraph } from "./igraph.js";

/** A directed graph, additionally distinguishing in- and out-neighbors. */
export interface IDirectedGraph<
	N,
	E extends DefinedValue | void = void,
> extends IGraph<N, E> {
	inNeighbors(node: N): IterableIterator<N>;
	outNeighbors(node: N): IterableIterator<N>;
	inDegree(node: N): number;
	outDegree(node: N): number;
}
