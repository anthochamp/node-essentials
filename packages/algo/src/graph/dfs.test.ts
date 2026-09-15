import { describe, expect, it } from "vitest";

import { dfs, DfsWalkSkipChildren, DfsWalkStop } from "./dfs.js";

interface UniformNode {
	readonly id: string;
	readonly children?: readonly UniformNode[];
}

const childrenOf = (node: UniformNode) => node.children;

describe("dfs", () => {
	it("visits every node in pre-order", () => {
		const tree: UniformNode = {
			id: "a",
			children: [{ id: "b", children: [{ id: "d" }] }, { id: "c" }],
		};
		const visited: string[] = [];

		const stopped = dfs(tree, {
			childrenOf,
			onEnter: (node) => {
				visited.push(node.id);
			},
		});

		expect(stopped).toBe(false);
		expect(visited).toEqual(["a", "b", "d", "c"]);
	});

	it("stops the entire walk on WalkStop", () => {
		const tree: UniformNode = {
			id: "a",
			children: [{ id: "b" }, { id: "c" }],
		};
		const visited: string[] = [];

		const stopped = dfs(tree, {
			childrenOf,
			onEnter: (node) => {
				visited.push(node.id);
				return node.id === "b" ? DfsWalkStop : undefined;
			},
		});

		expect(stopped).toBe(true);
		expect(visited).toEqual(["a", "b"]);
	});

	it("skips descending into a node's children on WalkSkipChildren", () => {
		const tree: UniformNode = {
			id: "a",
			children: [{ id: "b", children: [{ id: "skipped" }] }, { id: "c" }],
		};
		const visited: string[] = [];

		dfs(tree, {
			childrenOf,
			onEnter: (node) => {
				visited.push(node.id);
				return node.id === "b" ? DfsWalkSkipChildren : undefined;
			},
		});

		expect(visited).toEqual(["a", "b", "c"]);
	});

	it("calls onExit in post-order, after a node's children", () => {
		const tree: UniformNode = {
			id: "a",
			children: [{ id: "b", children: [{ id: "d" }] }, { id: "c" }],
		};
		const events: string[] = [];

		dfs(tree, {
			childrenOf,
			onEnter: (node) => {
				events.push(`>${node.id}`);
			},
			onExit: (node) => {
				events.push(`<${node.id}`);
			},
		});

		expect(events).toEqual([">a", ">b", ">d", "<d", "<b", ">c", "<c", "<a"]);
	});

	it("calls onExit for every entered node even when the walk stops early", () => {
		const tree: UniformNode = {
			id: "a",
			children: [{ id: "b", children: [{ id: "stop" }] }, { id: "c" }],
		};
		const entered: string[] = [];
		const exited: string[] = [];

		dfs(tree, {
			childrenOf,
			onEnter: (node) => {
				entered.push(node.id);
				return node.id === "stop" ? DfsWalkStop : undefined;
			},
			onExit: (node) => {
				exited.push(node.id);
			},
		});

		expect(entered).toEqual(["a", "b", "stop"]);
		expect(exited).toEqual(["stop", "b", "a"]);
	});

	it("visits a node reachable twice only once when given a seen set", () => {
		const shared: UniformNode = { id: "shared" };
		const tree: UniformNode = {
			id: "a",
			children: [
				{ id: "b", children: [shared] },
				{ id: "c", children: [shared] },
			],
		};
		const visited: string[] = [];

		dfs(tree, {
			childrenOf,
			seen: new Set<UniformNode>(),
			onEnter: (node) => {
				visited.push(node.id);
			},
		});

		expect(visited).toEqual(["a", "b", "shared", "c"]);
	});

	// A discriminated union where each kind exposes children under a different
	// field — the motivating case for a callback-based `childrenOf` instead of
	// a shared `children` property (mirrors format/asn1-notation's AST).
	type HeterogeneousNode =
		| { readonly kind: "leaf"; readonly value: number }
		| { readonly kind: "list"; readonly items: readonly HeterogeneousNode[] }
		| { readonly kind: "wrapper"; readonly inner: HeterogeneousNode };

	function heterogeneousChildrenOf(
		node: HeterogeneousNode,
	): Iterable<HeterogeneousNode> | undefined {
		switch (node.kind) {
			case "leaf":
				return undefined;
			case "list":
				return node.items;
			case "wrapper":
				return [node.inner];
		}
	}

	it("walks a discriminated union via a per-kind childrenOf", () => {
		const tree: HeterogeneousNode = {
			kind: "list",
			items: [
				{ kind: "wrapper", inner: { kind: "leaf", value: 1 } },
				{ kind: "leaf", value: 2 },
			],
		};
		const visitedKinds: string[] = [];

		dfs(tree, {
			childrenOf: heterogeneousChildrenOf,
			onEnter: (node) => {
				visitedKinds.push(node.kind);
			},
		});

		expect(visitedKinds).toEqual(["list", "wrapper", "leaf", "leaf"]);
	});

	it("treats a leaf node as a single visit", () => {
		const visited: string[] = [];

		dfs<UniformNode>(
			{ id: "solo" },
			{
				childrenOf,
				onEnter: (node) => {
					visited.push(node.id);
				},
			},
		);

		expect(visited).toEqual(["solo"]);
	});
});
