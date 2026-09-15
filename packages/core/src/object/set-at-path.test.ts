import { describe, expect, it } from "vitest";

import { getAtPath } from "./get-at-path.js";
import { setAtPath } from "./set-at-path.js";

describe("setAtPath", () => {
	it("is a no-op for an empty path", () => {
		const obj = { a: 1 };
		setAtPath(obj, [], "x");
		expect(obj).toEqual({ a: 1 });
	});

	it("sets a top-level object property", () => {
		const obj: Record<string, unknown> = { a: 1 };
		setAtPath(obj, ["a"], 99);
		expect(obj).toEqual({ a: 99 });
	});

	it("sets a top-level array element", () => {
		const arr: unknown[] = [1, 2, 3];
		setAtPath(arr, [1], 99);
		expect(arr).toEqual([1, 99, 3]);
	});

	it("creates nested objects for string keys", () => {
		const obj: Record<string, unknown> = {};
		setAtPath(obj, ["a", "b", "c"], "deep");
		expect(obj).toEqual({ a: { b: { c: "deep" } } });
	});

	it("creates a nested array when the next key is a number", () => {
		const obj: Record<string, unknown> = {};
		setAtPath(obj, ["items", 0], "first");
		expect(obj).toEqual({ items: ["first"] });
	});

	it("creates a mixed object/array path", () => {
		const obj: Record<string, unknown> = {};
		setAtPath(obj, ["users", 0, "name"], "Alice");
		expect(obj).toEqual({ users: [{ name: "Alice" }] });
	});

	it("overwrites an existing value", () => {
		const obj: Record<string, unknown> = { a: { b: "old" } };
		setAtPath(obj, ["a", "b"], "new");
		expect(obj).toEqual({ a: { b: "new" } });
	});

	it("replaces a null intermediate with an object when the next key is a string", () => {
		const obj: Record<string, unknown> = { a: null };
		setAtPath(obj, ["a", "b"], "val");
		expect(obj).toEqual({ a: { b: "val" } });
	});

	it("replaces a null intermediate with an array when the next key is a number", () => {
		const obj: Record<string, unknown> = { a: null };
		setAtPath(obj, ["a", 0], "val");
		expect(obj).toEqual({ a: ["val"] });
	});

	it("replaces a string primitive intermediate with an object", () => {
		const obj: Record<string, unknown> = { a: "" };
		setAtPath(obj, ["a", "b"], "val");
		expect(obj).toEqual({ a: { b: "val" } });
	});

	it("replaces a number primitive intermediate with an object", () => {
		const obj: Record<string, unknown> = { a: 0 };
		setAtPath(obj, ["a", "b"], "val");
		expect(obj).toEqual({ a: { b: "val" } });
	});

	it("replaces a boolean primitive intermediate with an object", () => {
		const obj: Record<string, unknown> = { a: false };
		setAtPath(obj, ["a", "b"], "val");
		expect(obj).toEqual({ a: { b: "val" } });
	});

	it("replaces a string primitive intermediate with an array when the next key is a number", () => {
		const obj: Record<string, unknown> = { a: "" };
		setAtPath(obj, ["a", 0], "val");
		expect(obj).toEqual({ a: ["val"] });
	});

	it("replaces a primitive at an array position mid-path", () => {
		const arr: unknown[] = ["not-an-object"];
		setAtPath(arr, [0, "b"], "val");
		expect(arr).toEqual([{ b: "val" }]);
	});

	it("sets undefined as a value explicitly", () => {
		const obj: Record<string, unknown> = { a: 1 };
		setAtPath(obj, ["a"], undefined);
		expect(obj).toHaveProperty("a", undefined);
	});

	it("sets null as a value explicitly", () => {
		const obj: Record<string, unknown> = { a: 1 };
		setAtPath(obj, ["a"], null);
		expect(obj).toEqual({ a: null });
	});

	it("round-trips with getAtPath", () => {
		const obj: Record<string, unknown> = {};
		setAtPath(obj, ["x", "y", "z"], 42);
		expect(getAtPath(obj, ["x", "y", "z"])).toBe(42);
	});

	it("sets multiple paths independently", () => {
		const obj: Record<string, unknown> = {};
		setAtPath(obj, ["a", "x"], 1);
		setAtPath(obj, ["a", "y"], 2);
		setAtPath(obj, ["b"], 3);
		expect(obj).toEqual({ a: { x: 1, y: 2 }, b: 3 });
	});

	it("is a no-op when a non-numeric string key targets an array (last key)", () => {
		const arr: unknown[] = [1, 2, 3];
		setAtPath(arr, ["foo"], 99);
		expect(arr).toEqual([1, 2, 3]);
	});

	it("is a no-op when a non-numeric string key targets an array (mid-path)", () => {
		const arr: unknown[] = [[1, 2]];
		setAtPath(arr, ["foo", 0], 99);
		expect(arr).toEqual([[1, 2]]);
	});

	it("accepts a stringified numeric key on an array (last key)", () => {
		const arr: unknown[] = [1, 2, 3];
		setAtPath(arr, ["1"], 99);
		expect(arr).toEqual([1, 99, 3]);
	});

	it("accepts a stringified numeric key on an array (mid-path)", () => {
		const arr: unknown[] = [[1, 2, 3]];
		setAtPath(arr, ["0", 1], 99);
		expect(arr).toEqual([[1, 99, 3]]);
	});

	// Unlike lodash _.set, string "0" as the *next* key creates an object, not an array.
	it("creates an object (not array) when the next key is a stringified number", () => {
		const obj: Record<string, unknown> = {};
		setAtPath(obj, ["a", "0"], "val");
		expect(obj).toEqual({ a: { "0": "val" } });
	});
});
