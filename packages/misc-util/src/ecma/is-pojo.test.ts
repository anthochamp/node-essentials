import { expect, suite, test } from "vitest";
import { isPojo } from "./is-pojo.js";

suite("isPojo", () => {
	test("should return true for plain objects", () => {
		expect(isPojo({})).toBe(true);
		expect(isPojo({ a: 1, b: 2 })).toBe(true);
		expect(isPojo(Object.create(null))).toBe(true);
		expect(isPojo(Object.create({}))).toBe(true);
		expect(isPojo(Object.create(Object.prototype))).toBe(true);
	});

	test("should return false for non-plain objects", () => {
		expect(isPojo([])).toBe(false); // arrays
		expect(isPojo(new Date())).toBe(false); // dates
		expect(isPojo(/regex/)).toBe(false); // regex
		expect(isPojo(new Map())).toBe(false); // maps
		expect(isPojo(new Set())).toBe(false); // sets
		expect(isPojo(() => {})).toBe(false); // functions
		expect(isPojo(null)).toBe(false); // null
		expect(isPojo(undefined)).toBe(false); // undefined
		expect(isPojo(42)).toBe(false); // numbers
		expect(isPojo("string")).toBe(false); // strings
		expect(isPojo(true)).toBe(false); // booleans
		expect(isPojo(Symbol("sym"))).toBe(false); // symbols
		expect(isPojo(new (class A {})())).toBe(false); // class instances
	});
});
