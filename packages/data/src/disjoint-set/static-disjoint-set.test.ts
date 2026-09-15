import { expect, suite, test } from "vitest";

import { StaticDisjointSet } from "./static-disjoint-set.js";

suite("StaticDisjointSet", () => {
	test("should start with one set per item", () => {
		const partition = new StaticDisjointSet<string>(["a", "b", "c"]);

		expect(partition.count()).toBe(3);
		expect(partition.setCount()).toBe(3);
		expect(partition.connected("a", "b")).toBe(false);
	});

	test("should treat makeSet of a known item as a no-op", () => {
		const partition = new StaticDisjointSet<string>(["a"]);

		partition.makeSet("a");

		expect(partition.count()).toBe(1);
		expect(partition.setCount()).toBe(1);
	});

	test("should merge two sets and report it", () => {
		const partition = new StaticDisjointSet<string>(["a", "b", "c"]);

		expect(partition.union("a", "b")).toBe(true);

		expect(partition.setCount()).toBe(2);
		expect(partition.connected("a", "b")).toBe(true);
		expect(partition.connected("a", "c")).toBe(false);
	});

	test("should report a union of two items already together", () => {
		const partition = new StaticDisjointSet<string>(["a", "b"]);

		partition.union("a", "b");

		expect(partition.union("a", "b")).toBe(false);
		expect(partition.union("b", "a")).toBe(false);
		expect(partition.setCount()).toBe(1);
	});

	test("should give every member of a set the same representative", () => {
		const partition = new StaticDisjointSet<string>(["a", "b", "c"]);

		partition.union("a", "b");
		partition.union("b", "c");

		const root = partition.find("a");

		expect(partition.find("b")).toBe(root);
		expect(partition.find("c")).toBe(root);
		expect(partition.setCount()).toBe(1);
	});

	test("should add an unknown operand of union as a new singleton", () => {
		const partition = new StaticDisjointSet<string>();

		expect(partition.union("a", "b")).toBe(true);

		expect(partition.count()).toBe(2);
		expect(partition.setCount()).toBe(1);
		expect(partition.connected("a", "b")).toBe(true);
	});

	test("should not add anything when queried about an unknown item", () => {
		const partition = new StaticDisjointSet<string>(["a"]);

		expect(partition.connected("a", "missing")).toBe(false);
		expect(partition.find("missing")).toBeUndefined();
		expect(partition.has("missing")).toBe(false);
		expect(partition.count()).toBe(1);
	});

	test("should stay correct across a long chain, which path compression flattens", () => {
		const LENGTH = 10_000;
		const partition = new StaticDisjointSet<number>();

		for (let index = 1; index < LENGTH; index++) {
			partition.union(index - 1, index);
		}

		expect(partition.setCount()).toBe(1);
		expect(partition.connected(0, LENGTH - 1)).toBe(true);
		expect(partition.find(0)).toBe(partition.find(LENGTH - 1));
	});

	test("should group members by set", () => {
		const partition = new StaticDisjointSet<string>(["a", "b", "c", "d"]);

		partition.union("a", "b");
		partition.union("c", "d");

		const groups = Array.from(partition.groups(), (group) =>
			Array.from(group).sort(),
		).sort((left, right) =>
			(left[0] as string).localeCompare(right[0] as string),
		);

		expect(groups).toEqual([
			["a", "b"],
			["c", "d"],
		]);
	});

	test("should hold no sets when empty", () => {
		const partition = new StaticDisjointSet<string>();

		expect(partition.setCount()).toBe(0);
		expect(partition.count()).toBe(0);
		expect(Array.from(partition.groups())).toEqual([]);
	});
});
