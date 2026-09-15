import { expect, suite, test } from "vitest";

import { Graph } from "./graph.js";

const sorted = (nodes: Iterable<string>): string[] => Array.from(nodes).sort();

suite("Graph", () => {
	test("should add nodes without edges", () => {
		const graph = new Graph<string>(["a", "b"]);

		expect(graph.nodeCount()).toBe(2);
		expect(graph.edgeCount()).toBe(0);
		expect(graph.hasNode("a")).toBe(true);
		expect(graph.hasNode("z")).toBe(false);
		expect(sorted(graph.nodes())).toEqual(["a", "b"]);
	});

	test("should treat adding a known node as a no-op", () => {
		const graph = new Graph<string>(["a"]);

		graph.addEdge("a", "b");
		graph.addNode("a");

		expect(graph.nodeCount()).toBe(2);
		expect(graph.hasEdge("a", "b")).toBe(true);
	});

	test("should make an edge visible from both endpoints", () => {
		const graph = new Graph<string>();

		graph.addEdge("a", "b");

		expect(graph.hasEdge("a", "b")).toBe(true);
		expect(graph.hasEdge("b", "a")).toBe(true);
		expect(graph.edgeCount()).toBe(1);
		expect(sorted(graph.neighbors("a"))).toEqual(["b"]);
		expect(sorted(graph.neighbors("b"))).toEqual(["a"]);
	});

	test("should create unknown endpoints when adding an edge", () => {
		const graph = new Graph<string>();

		graph.addEdge("a", "b");

		expect(graph.nodeCount()).toBe(2);
	});

	test("should replace rather than duplicate a re-added edge", () => {
		const graph = new Graph<string, number>();

		graph.addEdge("a", "b", 1);
		graph.addEdge("a", "b", 2);

		expect(graph.edgeCount()).toBe(1);
		expect(graph.edgeLabel("a", "b")).toBe(2);
		expect(graph.edgeLabel("b", "a")).toBe(2);
	});

	test("should carry edge labels in both directions", () => {
		const graph = new Graph<string, number>();

		graph.addEdge("a", "b", 7);

		expect(graph.edgeLabel("a", "b")).toBe(7);
		expect(graph.edgeLabel("b", "a")).toBe(7);
		expect(graph.edgeLabel("a", "z")).toBeUndefined();
	});

	test("should report degree, counting a self-loop once", () => {
		const graph = new Graph<string>();

		graph.addEdge("a", "b");
		graph.addEdge("a", "c");
		graph.addEdge("a", "a");

		expect(graph.degree("a")).toBe(3);
		expect(graph.degree("b")).toBe(1);
		expect(graph.degree("unknown")).toBe(0);
		expect(graph.edgeCount()).toBe(3);
	});

	test("should yield each undirected edge once", () => {
		const graph = new Graph<string, number>();

		graph.addEdge("a", "b", 1);
		graph.addEdge("b", "c", 2);
		graph.addEdge("a", "a", 3);

		const edges = Array.from(graph.edges(), ([from, to]) =>
			[from, to].sort().join("-"),
		).sort();

		expect(edges).toEqual(["a-a", "a-b", "b-c"]);
		expect(graph.edgeCount()).toBe(3);
	});

	suite("deletion", () => {
		test("should delete an edge from both endpoints", () => {
			const graph = new Graph<string>();

			graph.addEdge("a", "b");

			expect(graph.deleteEdge("a", "b")).toBe(true);

			expect(graph.hasEdge("a", "b")).toBe(false);
			expect(graph.hasEdge("b", "a")).toBe(false);
			expect(graph.edgeCount()).toBe(0);
			expect(graph.nodeCount()).toBe(2);
		});

		test("should delete an edge given either orientation", () => {
			const graph = new Graph<string>();

			graph.addEdge("a", "b");

			expect(graph.deleteEdge("b", "a")).toBe(true);
			expect(graph.edgeCount()).toBe(0);
		});

		test("should report a delete that matched nothing", () => {
			const graph = new Graph<string>(["a"]);

			expect(graph.deleteEdge("a", "b")).toBe(false);
			expect(graph.deleteEdge("x", "y")).toBe(false);
			expect(graph.deleteNode("x")).toBe(false);
		});

		test("should delete a node and every edge touching it", () => {
			const graph = new Graph<string>();

			graph.addEdge("a", "b");
			graph.addEdge("a", "c");
			graph.addEdge("b", "c");

			expect(graph.deleteNode("a")).toBe(true);

			expect(graph.nodeCount()).toBe(2);
			expect(graph.edgeCount()).toBe(1);
			expect(graph.hasEdge("b", "c")).toBe(true);
			expect(sorted(graph.neighbors("b"))).toEqual(["c"]);
			expect(sorted(graph.neighbors("c"))).toEqual(["b"]);
		});

		test("should delete a node carrying a self-loop", () => {
			const graph = new Graph<string>();

			graph.addEdge("a", "a");
			graph.addEdge("a", "b");

			expect(graph.deleteNode("a")).toBe(true);

			expect(graph.edgeCount()).toBe(0);
			expect(graph.nodeCount()).toBe(1);
			expect(graph.degree("b")).toBe(0);
		});
	});

	test("should yield no neighbors for an unknown node", () => {
		const graph = new Graph<string>();

		expect(Array.from(graph.neighbors("missing"))).toEqual([]);
	});
});
