/** biome-ignore-all lint/style/useArrayLiterals: test */
/** biome-ignore-all lint/complexity/useArrowFunction: test */
import { describe, expect, it } from "vitest";
import { isObject } from "./is-object.js";

describe("isObject", () => {
	it("should return true for object-like values", () => {
		expect(isObject({})).toBe(true);
		expect(isObject(new Date())).toBe(true);
		expect(isObject(/a/g)).toBe(true);
		expect(isObject(new Map())).toBe(true);
		expect(isObject(new Set())).toBe(true);
		expect(isObject(new WeakMap())).toBe(true);
		expect(isObject(new WeakSet())).toBe(true);
		expect(isObject(Object.create(null))).toBe(true);
		expect(isObject(new (class A {})())).toBe(true);
	});

	it("should return false for primitive", () => {
		expect(isObject(null)).toBe(false);
		expect(isObject(undefined)).toBe(false);
		expect(isObject(42)).toBe(false);
		expect(isObject("hello")).toBe(false);
		expect(isObject(true)).toBe(false);
		expect(isObject(Symbol("sym"))).toBe(false);
	});

	it("should return false for functions", () => {
		expect(isObject(() => {})).toBe(false);
		expect(isObject(function () {})).toBe(false);
		expect(isObject(async () => {})).toBe(false);
	});

	it("should return false for arrays", () => {
		expect(isObject([])).toBe(false);
		expect(isObject([1, 2, 3])).toBe(false);
		expect(isObject(new Array())).toBe(false);
	});
});
