import { expect, suite, test } from "vitest";
import { uniqBy } from "./uniq-by.js";

suite("uniqBy", () => {
	test("should remove duplicates based on the key returned by the iteratee", () => {
		const array = [
			{ id: 1, name: "Alice" },
			{ id: 2, name: "Bob" },
			{ id: 1, name: "Charlie" },
			{ id: 3, name: "David" },
		];
		const result = uniqBy(array, (item) => item.id);
		expect(result).toEqual([
			{ id: 1, name: "Alice" },
			{ id: 2, name: "Bob" },
			{ id: 3, name: "David" },
		]);
	});

	test("should work with an empty array", () => {
		const array: { id: number; name: string }[] = [];
		const result = uniqBy(array, (item) => item.id);
		expect(result).toEqual([]);
	});

	test("should work when all elements are unique", () => {
		const array = [
			{ id: 1, name: "Alice" },
			{ id: 2, name: "Bob" },
			{ id: 3, name: "Charlie" },
		];
		const result = uniqBy(array, (item) => item.id);
		expect(result).toEqual(array);
	});

	test("should work when all elements are duplicates", () => {
		const array = [
			{ id: 1, name: "Alice" },
			{ id: 1, name: "Bob" },
			{ id: 1, name: "Charlie" },
		];
		const result = uniqBy(array, (item) => item.id);
		expect(result).toEqual([{ id: 1, name: "Alice" }]);
	});
});
