import GraphologyExport from "graphology";

/** The subset of `graphology`'s surface the graph suite uses. */
type GraphologyLike = {
	readonly size: number;
	mergeEdge(from: string, to: string): unknown;
	forEachNode(callback: (node: string) => void): void;
	forEachNeighbor(node: string, callback: (neighbor: string) => void): void;
};

/**
 * `graphology` declares `export default` in a `.d.ts` that NodeNext resolves as
 * CommonJS, so the default import lands on the namespace object rather than the
 * class — the same packaging wart as `sorted-btree`.
 */
export const Graphology = ((
	GraphologyExport as unknown as { default?: unknown }
).default ?? GraphologyExport) as new (options?: {
	type?: "undirected" | "directed" | "mixed";
	multi?: boolean;
}) => GraphologyLike;
