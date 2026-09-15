import { expect, suite, test } from "vitest";

import { DirectedGraph } from "./directed-graph.js";

const sorted = (nodes: Iterable<string>): string[] => Array.from(nodes).sort();

suite("DirectedGraph", () => {
	test("should add a one-way edge", () => {
		const graph = new DirectedGraph<string>();

		graph.addEdge("a", "b");

		expect(graph.hasEdge("a", "b")).toBe(true);
		expect(graph.hasEdge("b", "a")).toBe(false);
		expect(graph.edgeCount()).toBe(1);
	});

	test("should treat the two orientations as distinct edges", () => {
		const graph = new DirectedGraph<string, number>();

		graph.addEdge("a", "b", 1);
		graph.addEdge("b", "a", 2);

		expect(graph.edgeCount()).toBe(2);
		expect(graph.edgeLabel("a", "b")).toBe(1);
		expect(graph.edgeLabel("b", "a")).toBe(2);
	});

	test("should replace rather than duplicate a re-added edge", () => {
		const graph = new DirectedGraph<string, number>();

		graph.addEdge("a", "b", 1);
		graph.addEdge("a", "b", 2);

		expect(graph.edgeCount()).toBe(1);
		expect(graph.edgeLabel("a", "b")).toBe(2);
	});

	test("should separate in- and out-neighbors", () => {
		const graph = new DirectedGraph<string>();

		graph.addEdge("a", "b");
		graph.addEdge("c", "b");
		graph.addEdge("b", "d");

		expect(sorted(graph.inNeighbors("b"))).toEqual(["a", "c"]);
		expect(sorted(graph.outNeighbors("b"))).toEqual(["d"]);
		expect(graph.inDegree("b")).toBe(2);
		expect(graph.outDegree("b")).toBe(1);
	});

	test("should resolve neighbors to out-neighbors and degree to in plus out", () => {
		const graph = new DirectedGraph<string>();

		graph.addEdge("a", "b");
		graph.addEdge("c", "b");
		graph.addEdge("b", "d");

		expect(sorted(graph.neighbors("b"))).toEqual(["d"]);
		expect(graph.degree("b")).toBe(3);
	});

	test("should count a self-loop in both directions", () => {
		const graph = new DirectedGraph<string>();

		graph.addEdge("a", "a");

		expect(graph.edgeCount()).toBe(1);
		expect(graph.inDegree("a")).toBe(1);
		expect(graph.outDegree("a")).toBe(1);
		expect(graph.degree("a")).toBe(2);
	});

	test("should report zero degree for an unknown node", () => {
		const graph = new DirectedGraph<string>();

		expect(graph.inDegree("missing")).toBe(0);
		expect(graph.outDegree("missing")).toBe(0);
		expect(Array.from(graph.inNeighbors("missing"))).toEqual([]);
		expect(Array.from(graph.outNeighbors("missing"))).toEqual([]);
	});

	test("should yield every directed edge", () => {
		const graph = new DirectedGraph<string, number>();

		graph.addEdge("a", "b", 1);
		graph.addEdge("b", "a", 2);

		const edges = Array.from(
			graph.edges(),
			([from, to, label]) => `${from}->${to}:${label}`,
		).sort();

		expect(edges).toEqual(["a->b:1", "b->a:2"]);
	});

	suite("deletion", () => {
		test("should delete only the named direction", () => {
			const graph = new DirectedGraph<string>();

			graph.addEdge("a", "b");
			graph.addEdge("b", "a");

			expect(graph.deleteEdge("a", "b")).toBe(true);

			expect(graph.hasEdge("a", "b")).toBe(false);
			expect(graph.hasEdge("b", "a")).toBe(true);
			expect(graph.edgeCount()).toBe(1);
		});

		test("should report a delete that matched nothing", () => {
			const graph = new DirectedGraph<string>(["a"]);

			expect(graph.deleteEdge("a", "b")).toBe(false);
			expect(graph.deleteNode("x")).toBe(false);
		});

		test("should delete a node and every edge into or out of it", () => {
			const graph = new DirectedGraph<string>();

			graph.addEdge("a", "b");
			graph.addEdge("c", "b");
			graph.addEdge("b", "d");
			graph.addEdge("c", "d");

			expect(graph.deleteNode("b")).toBe(true);

			expect(graph.nodeCount()).toBe(3);
			expect(graph.edgeCount()).toBe(1);
			expect(graph.hasEdge("c", "d")).toBe(true);
			expect(graph.outDegree("a")).toBe(0);
			expect(graph.inDegree("d")).toBe(1);
		});

		test("should delete a node carrying a self-loop without double counting", () => {
			const graph = new DirectedGraph<string>();

			graph.addEdge("a", "a");
			graph.addEdge("a", "b");
			graph.addEdge("b", "a");

			expect(graph.edgeCount()).toBe(3);
			expect(graph.deleteNode("a")).toBe(true);

			expect(graph.edgeCount()).toBe(0);
			expect(graph.nodeCount()).toBe(1);
			expect(graph.degree("b")).toBe(0);
		});
	});
});
