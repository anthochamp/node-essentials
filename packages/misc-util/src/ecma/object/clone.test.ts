import { expect, suite, test } from "vitest";
import { UnsupportedError } from "../error/unsupported-error.js";
import { clone } from "./clone.js";

suite("clone", () => {
	test("should clone plain objects", () => {
		const obj = { a: 1, b: { c: 2 } };
		const cloned = clone(obj);

		expect(cloned).toEqual(obj);
		expect(cloned).not.toBe(obj);
		expect(cloned.b).toBe(obj.b); // Shallow clone, nested objects are the same reference
	});

	test("should clone arrays", () => {
		const arr = [1, 2, { a: 3 }];
		const cloned = clone(arr);

		expect(cloned).toEqual(arr);
		expect(cloned).not.toBe(arr);
		expect(cloned[2]).toBe(arr[2]); // Shallow clone, nested objects are the same reference
	});

	test("should return primitives as is", () => {
		expect(clone(42)).toBe(42);
		expect(clone("hello")).toBe("hello");
		expect(clone(true)).toBe(true);
		expect(clone(null)).toBe(null);
		expect(clone(undefined)).toBe(undefined);
		expect(clone(10n)).toBe(10n);
	});

	test("should throw when trying to clone functions", () => {
		const func = () => {};
		expect(() => clone(func)).toThrow(UnsupportedError);
	});

	test("should throw when trying to clone symbols", () => {
		const sym = Symbol("test");
		expect(() => clone(sym)).toThrow(UnsupportedError);
	});

	test("should clone Date objects", () => {
		const date = new Date();
		const cloned = clone(date);

		expect(cloned).toEqual(date);
		expect(cloned).not.toBe(date);
	});

	test("should clone RegExp objects", () => {
		const regex = /test/;
		const cloned = clone(regex);

		expect(cloned).toEqual(regex);
		expect(cloned).not.toBe(regex);
	});

	test("should clone Map objects", () => {
		const map = new Map();
		map.set("a", 1);
		const cloned = clone(map);

		expect(cloned).toEqual(map);
		expect(cloned).not.toBe(map);
	});

	test("should clone Set objects", () => {
		const set = new Set([1, 2, 3]);
		const cloned = clone(set);

		expect(cloned).toEqual(set);
		expect(cloned).not.toBe(set);
	});
});
