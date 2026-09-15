import { expect, suite, test } from "vitest";

import { MultiSet } from "./multi-set.js";

suite("MultiSet", () => {
	test("should count totals and distinct items separately", () => {
		const set = new MultiSet<string>(["a", "a", "b"]);

		expect(set.count()).toBe(3);
		expect(set.distinctCount()).toBe(2);
		expect(set.multiplicity("a")).toBe(2);
		expect(set.multiplicity("missing")).toBe(0);
	});

	test("should add several occurrences at once", () => {
		const set = new MultiSet<string>();

		set.add("a", 3);
		set.add("a");

		expect(set.multiplicity("a")).toBe(4);
		expect(set.count()).toBe(4);
		expect(set.distinctCount()).toBe(1);
	});

	test("should treat adding zero occurrences as a no-op", () => {
		const set = new MultiSet<string>();

		set.add("a", 0);

		expect(set.has("a")).toBe(false);
		expect(set.count()).toBe(0);
	});

	test("should reject a negative or fractional occurrence count", () => {
		const set = new MultiSet<string>();

		expect(() => set.add("a", -1)).toThrow(RangeError);
		expect(() => set.add("a", 1.5)).toThrow(RangeError);
		expect(() => set.delete("a", -1)).toThrow(RangeError);
		expect(() => set.addAll(["a"], -1)).toThrow(RangeError);
	});

	test("should addAll a given number of each item", () => {
		const set = new MultiSet<string>();

		set.addAll(["a", "b"], 2);

		expect(set.multiplicity("a")).toBe(2);
		expect(set.multiplicity("b")).toBe(2);
		expect(set.count()).toBe(4);
	});

	test("should remove one occurrence by default", () => {
		const set = new MultiSet<string>(["a", "a"]);

		expect(set.delete("a")).toBe(1);

		expect(set.multiplicity("a")).toBe(1);
		expect(set.has("a")).toBe(true);
	});

	test("should drop the item once its last occurrence goes", () => {
		const set = new MultiSet<string>(["a"]);

		expect(set.delete("a")).toBe(1);

		expect(set.has("a")).toBe(false);
		expect(set.distinctCount()).toBe(0);
		expect(Array.from(set.distinct())).toEqual([]);
	});

	test("should clamp an over-large delete rather than throwing", () => {
		const set = new MultiSet<string>(["a", "a"]);

		expect(set.delete("a", 99)).toBe(2);

		expect(set.count()).toBe(0);
		expect(set.has("a")).toBe(false);
	});

	test("should report a delete that matched nothing", () => {
		const set = new MultiSet<string>(["a"]);

		expect(set.delete("missing")).toBe(0);
		expect(set.delete("a", 0)).toBe(0);
		expect(set.count()).toBe(1);
	});

	test("should iterate each item as many times as it is held", () => {
		const set = new MultiSet<string>();

		set.add("a", 2);
		set.add("b");

		expect(Array.from(set)).toEqual(["a", "a", "b"]);
		expect(Array.from(set.distinct())).toEqual(["a", "b"]);
		expect(Array.from(set.entries())).toEqual([
			["a", 2],
			["b", 1],
		]);
	});

	test("should clear every item", () => {
		const set = new MultiSet<string>(["a", "a"]);

		set.clear();

		expect(set.count()).toBe(0);
		expect(set.distinctCount()).toBe(0);
		expect(Array.from(set)).toEqual([]);
	});
});
