import { describe, expect, it } from "vitest";

import { getAtPath } from "./get-at-path.js";

describe("getAtPath", () => {
	it("returns root for an empty path", () => {
		const obj = { a: 1 };
		expect(getAtPath(obj, [])).toBe(obj);
	});

	it("returns a primitive root for an empty path", () => {
		expect(getAtPath(42, [])).toBe(42);
	});

	it("gets a top-level object property", () => {
		expect(getAtPath({ a: 42 }, ["a"])).toBe(42);
	});

	it("gets a nested object property", () => {
		expect(getAtPath({ a: { b: { c: "deep" } } }, ["a", "b", "c"])).toBe(
			"deep",
		);
	});

	it("gets an array element by index", () => {
		expect(getAtPath([10, 20, 30], [1])).toBe(20);
	});

	it("navigates a mixed object/array path", () => {
		expect(
			getAtPath({ users: [{ name: "Alice" }, { name: "Bob" }] }, [
				"users",
				1,
				"name",
			]),
		).toBe("Bob");
	});

	it("returns undefined for a missing key", () => {
		expect(getAtPath({ a: 1 }, ["b"])).toBeUndefined();
	});

	it("returns undefined when a mid-path segment is missing", () => {
		expect(getAtPath({ a: {} }, ["a", "b", "c"])).toBeUndefined();
	});

	it("returns undefined when a mid-path segment is null", () => {
		expect(getAtPath({ a: null }, ["a", "b"])).toBeUndefined();
	});

	it("returns undefined when a mid-path segment is a primitive", () => {
		expect(getAtPath({ a: 42 }, ["a", "b"])).toBeUndefined();
	});

	it("returns undefined when root is a primitive with a non-empty path", () => {
		expect(getAtPath(42, ["a"])).toBeUndefined();
	});

	it("returns undefined when root is null with a non-empty path", () => {
		expect(getAtPath(null, ["a"])).toBeUndefined();
	});

	it("returns null when the value at the path is null", () => {
		expect(getAtPath({ a: null }, ["a"])).toBeNull();
	});

	it("returns 0 when the value at the path is 0", () => {
		expect(getAtPath({ a: 0 }, ["a"])).toBe(0);
	});

	it("returns false when the value at the path is false", () => {
		expect(getAtPath({ a: false }, ["a"])).toBe(false);
	});

	it("returns undefined when the value at the array index is out of bounds", () => {
		expect(getAtPath([1, 2, 3], [5])).toBeUndefined();
	});

	it("traverses class instances mid-path", () => {
		class Point {
			x = 1;
		}
		const obj = { a: new Point() };
		expect(getAtPath(obj, ["a", "x"])).toBe(1);
	});

	it("returns undefined for a non-numeric string key on an array", () => {
		expect(getAtPath(["a", "b", "c"], ["foo"])).toBeUndefined();
	});

	it("returns undefined for a non-numeric string mid-path key on an array", () => {
		expect(getAtPath([[1, 2]], ["foo", 0])).toBeUndefined();
	});

	it("accepts a stringified numeric key on an array", () => {
		expect(getAtPath([10, 20, 30], ["1"])).toBe(20);
	});

	it("accepts a number key on an object via JS coercion", () => {
		expect(getAtPath({ 0: "zero" }, [0])).toBe("zero");
	});
});
