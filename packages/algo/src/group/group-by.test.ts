import { expect, suite, test } from "vitest";

import { groupBy } from "./group-by.js";

suite("groupBy", () => {
	test("should group items by the key returned by the iteratee", () => {
		const items = [
			{ kind: "fruit", name: "apple" },
			{ kind: "vegetable", name: "carrot" },
			{ kind: "fruit", name: "pear" },
		];

		expect(groupBy(items, [(item) => item.kind])).toEqual(
			new Map([
				[
					"fruit",
					[
						{ kind: "fruit", name: "apple" },
						{ kind: "fruit", name: "pear" },
					],
				],
				["vegetable", [{ kind: "vegetable", name: "carrot" }]],
			]),
		);
	});

	test("should preserve the first-seen order of group keys", () => {
		const result = groupBy([2, 1, 2, 3, 1], [(value) => value]);

		expect([...result.keys()]).toEqual([2, 1, 3]);
	});

	test("should accept non-array iterables", () => {
		const result = groupBy(new Set(["apple", "apricot", "banana"]), [
			(item) => item[0],
		]);

		expect(result).toEqual(
			new Map([
				["a", ["apple", "apricot"]],
				["b", ["banana"]],
			]),
		);
	});

	test("should return an empty map for an empty iterable", () => {
		expect(groupBy([], [() => "key"])).toEqual(new Map());
	});

	test("nests one map level per key accessor", () => {
		const items = [
			{ kind: "fruit", color: "red", name: "apple" },
			{ kind: "fruit", color: "yellow", name: "banana" },
			{ kind: "fruit", color: "red", name: "cherry" },
			{ kind: "veg", color: "red", name: "pepper" },
		];

		expect(groupBy(items, [(item) => item.kind, (item) => item.color])).toEqual(
			new Map([
				[
					"fruit",
					new Map([
						["red", [items[0], items[2]]],
						["yellow", [items[1]]],
					]),
				],
				["veg", new Map([["red", [items[3]]]])],
			]),
		);
	});

	test("throws when given no key accessor", () => {
		// @ts-expect-error Testing runtime behavior when no key accessor is provided
		expect(() => groupBy([1, 2])).toThrow();
	});
});
