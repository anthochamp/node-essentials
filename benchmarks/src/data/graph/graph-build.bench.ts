import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { randomInts } from "@ac-bench/util";
import { DirectedGraph, Graph } from "@ac-kit/data";
import { Graph as GraphlibGraph } from "graphlib";

import { Graphology } from "./__fixtures__/npm-graphs.js";

const NODES = 5_000;
const EDGES = 20_000;

const FROM = randomInts(EDGES, NODES, 0x1111_1111);
const TO = randomInts(EDGES, NODES, 0x2222_2222);

/** Distinct undirected pairs, so every contender agrees on the edge count. */
const DISTINCT_UNDIRECTED = (() => {
	const seen = new Set<string>();
	for (let index = 0; index < EDGES; index++) {
		const a = FROM[index]!;
		const b = TO[index]!;
		seen.add(a < b ? `${a}-${b}` : `${b}-${a}`);
	}
	return seen.size;
})();

const DISTINCT_DIRECTED = new Set(
	Array.from({ length: EDGES }, (_, index) => `${FROM[index]}>${TO[index]}`),
).size;

durationCondition(
	`Graph — build ${NODES} nodes and ${EDGES} edges, then walk every node's neighbours`,
	() => {
		durationCase(
			"@ac-kit/data Graph (undirected)",
			{ tags: { kind: "js", backing: "adjacency map" } },
			() => {
				const graph = new Graph<number>();

				for (let index = 0; index < EDGES; index++) {
					graph.addEdge(FROM[index]!, TO[index]!);
				}

				assert.strictEqual(graph.edgeCount(), DISTINCT_UNDIRECTED);

				let seen = 0;
				for (const node of graph.nodes()) {
					for (const _ of graph.neighbors(node)) seen++;
				}
				assert.ok(seen > 0);
			},
		);
		durationCase(
			"@ac-kit/data DirectedGraph",
			{ tags: { kind: "js", backing: "two adjacency maps" } },
			() => {
				const graph = new DirectedGraph<number>();

				for (let index = 0; index < EDGES; index++) {
					graph.addEdge(FROM[index]!, TO[index]!);
				}

				assert.strictEqual(graph.edgeCount(), DISTINCT_DIRECTED);

				let seen = 0;
				for (const node of graph.nodes()) {
					for (const _ of graph.outNeighbors(node)) seen++;
				}
				assert.strictEqual(seen, DISTINCT_DIRECTED);
			},
		);
		durationCase(
			"graphology (npm, undirected)",
			{ tags: { kind: "js", backing: "adjacency map" } },
			() => {
				const graph = new Graphology({ type: "undirected", multi: false });

				for (let index = 0; index < EDGES; index++) {
					graph.mergeEdge(String(FROM[index]), String(TO[index]));
				}

				assert.strictEqual(graph.size, DISTINCT_UNDIRECTED);

				let seen = 0;
				graph.forEachNode((node) => {
					graph.forEachNeighbor(node, () => {
						seen++;
					});
				});
				assert.ok(seen > 0);
			},
		);
		durationCase(
			"graphlib (npm, directed)",
			{ tags: { kind: "js", backing: "adjacency map" } },
			() => {
				const graph = new GraphlibGraph({ directed: true, multigraph: false });

				for (let index = 0; index < EDGES; index++) {
					graph.setEdge(String(FROM[index]), String(TO[index]));
				}

				assert.strictEqual(graph.edgeCount(), DISTINCT_DIRECTED);

				let seen = 0;
				for (const node of graph.nodes()) {
					seen += (graph.successors(node) || []).length;
				}
				assert.ok(seen > 0);
			},
		);
		durationCase(
			"Map<number, Set<number>>",
			{ tags: { kind: "js", backing: "map of sets" } },
			() => {
				// The hand-rolled adjacency list, for the case where someone would not
				// bother with a library at all. It carries no edge labels, which is
				// exactly the shortcut that makes it the fastest row here.
				const adjacency = new Map<number, Set<number>>();

				const link = (from: number, to: number): void => {
					let targets = adjacency.get(from);
					if (targets === undefined) {
						targets = new Set();
						adjacency.set(from, targets);
					}
					targets.add(to);
				};

				for (let index = 0; index < EDGES; index++) {
					link(FROM[index]!, TO[index]!);
				}

				let seen = 0;
				for (const targets of adjacency.values()) seen += targets.size;

				assert.strictEqual(seen, DISTINCT_DIRECTED);
			},
		);
	},
);
