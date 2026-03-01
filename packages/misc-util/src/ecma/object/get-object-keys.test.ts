import { describe, expect, it } from "vitest";
import { getObjectKeys } from "./get-object-keys.js";

describe("getObjectKeys", () => {
	describe("basic functionality", () => {
		it("should return string keys from a simple object", () => {
			const obj = { a: 1, b: 2, c: 3 };

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys).toEqual([
				{ property: "a", prototype: obj },
				{ property: "b", prototype: obj },
				{ property: "c", prototype: obj },
			]);
		});

		it("should return empty array for empty object", () => {
			const obj = {};

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys).toEqual([]);
		});

		it("should respect object key order", () => {
			const obj = { z: 1, a: 2, m: 3 };

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys.map((k) => k.property)).toEqual(["z", "a", "m"]);
		});
	});

	describe("includeSymbolKeys option", () => {
		it("should include symbol keys when includeSymbolKeys is true", () => {
			const sym1 = Symbol("sym1");
			const sym2 = Symbol("sym2");
			const obj = { a: 1, [sym1]: "value1", [sym2]: "value2" };

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: true,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys).toHaveLength(3);
			expect(keys.filter((k) => typeof k.property === "symbol")).toHaveLength(
				2,
			);
			expect(keys.some((k) => k.property === sym1)).toBe(true);
			expect(keys.some((k) => k.property === sym2)).toBe(true);
		});

		it("should exclude symbol keys when includeSymbolKeys is false", () => {
			const sym = Symbol("sym");
			const obj = { a: 1, [sym]: "value" };

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys).toEqual([{ property: "a", prototype: obj }]);
		});

		it("should handle well-known symbols", () => {
			const obj = { [Symbol.iterator]: function* () {}, regular: 1 };

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: true,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys).toHaveLength(2);
			expect(keys.some((k) => k.property === Symbol.iterator)).toBe(true);
		});
	});

	describe("includeNonEnumerable option", () => {
		it("should include non-enumerable properties when includeNonEnumerable is true", () => {
			const obj = { enumerable: 1 };
			Object.defineProperty(obj, "nonEnum", {
				value: "hidden",
				enumerable: false,
			});

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: false,
				includeNonEnumerable: true,
				includePrototypeChain: false,
			});

			expect(keys).toHaveLength(2);
			expect(keys.find((k) => k.property === "enumerable")).toEqual({
				property: "enumerable",
				prototype: obj,
			});
			expect(keys.find((k) => k.property === "nonEnum")).toEqual({
				property: "nonEnum",
				prototype: obj,
				nonEnumerable: true,
			});
		});

		it("should exclude non-enumerable properties when includeNonEnumerable is false", () => {
			const obj = { enumerable: 1 };
			Object.defineProperty(obj, "nonEnum", {
				value: "hidden",
				enumerable: false,
			});

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys).toEqual([{ property: "enumerable", prototype: obj }]);
		});

		it("should handle multiple non-enumerable properties", () => {
			const obj = { enumerable: 1 };
			Object.defineProperty(obj, "nonEnum1", {
				value: "hidden1",
				enumerable: false,
			});
			Object.defineProperty(obj, "nonEnum2", {
				value: "hidden2",
				enumerable: false,
			});

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: false,
				includeNonEnumerable: true,
				includePrototypeChain: false,
			});

			expect(keys).toHaveLength(3);
			expect(keys.filter((k) => k.nonEnumerable)).toHaveLength(2);
		});
	});

	describe("includePrototypeChain option", () => {
		it("should include properties from prototype chain when includePrototypeChain is true", () => {
			const parent = { parentProp: "parent" };
			const child = Object.create(parent);
			child.childProp = "child";

			const keys = getObjectKeys(child, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: true,
			});

			expect(keys).toHaveLength(2);
			expect(keys.some((k) => k.property === "childProp")).toBe(true);
			expect(keys.some((k) => k.property === "parentProp")).toBe(true);
		});

		it("should exclude properties from prototype chain when includePrototypeChain is false", () => {
			const parent = { parentProp: "parent" };
			const child = Object.create(parent);
			child.childProp = "child";

			const keys = getObjectKeys(child, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys).toEqual([{ property: "childProp", prototype: child }]);
		});

		it("should handle multiple levels in prototype chain", () => {
			const grandparent = { gpProp: "grandparent" };
			const parent = Object.create(grandparent);
			parent.parentProp = "parent";
			const child = Object.create(parent);
			child.childProp = "child";

			const keys = getObjectKeys(child, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: true,
			});

			expect(keys).toHaveLength(3);
			expect(keys.some((k) => k.property === "childProp")).toBe(true);
			expect(keys.some((k) => k.property === "parentProp")).toBe(true);
			expect(keys.some((k) => k.property === "gpProp")).toBe(true);
		});

		it("should not include Object.prototype properties", () => {
			const obj = { own: "value" };

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: true,
			});

			// Should not include toString, hasOwnProperty, etc.
			expect(
				keys.every(
					(k) => typeof k.property === "string" && k.property === "own",
				),
			).toBe(true);
		});
	});

	describe("combined options", () => {
		it("should handle all options enabled together", () => {
			const parent = { parentProp: "parent" };
			const sym = Symbol("test");
			const child = Object.create(parent);
			child.enumerable = "visible";
			child[sym] = "symbol value";
			Object.defineProperty(child, "nonEnum", {
				value: "hidden",
				enumerable: false,
			});

			const keys = getObjectKeys(child, {
				includeSymbolKeys: true,
				includeNonEnumerable: true,
				includePrototypeChain: true,
			});

			expect(keys.length).toBeGreaterThanOrEqual(4);
			expect(keys.some((k) => k.property === "enumerable")).toBe(true);
			expect(
				keys.some((k) => k.property === "nonEnum" && k.nonEnumerable),
			).toBe(true);
			expect(keys.some((k) => k.property === sym)).toBe(true);
			expect(keys.some((k) => k.property === "parentProp")).toBe(true);
		});

		it("should handle all options disabled together", () => {
			const parent = { parentProp: "parent" };
			const sym = Symbol("test");
			const child = Object.create(parent);
			child.enumerable = "visible";
			child[sym] = "symbol value";
			Object.defineProperty(child, "nonEnum", {
				value: "hidden",
				enumerable: false,
			});

			const keys = getObjectKeys(child, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys).toEqual([{ property: "enumerable", prototype: child }]);
		});
	});

	describe("edge cases", () => {
		it("should handle objects with numeric keys", () => {
			const obj = { 0: "zero", 1: "one", 10: "ten", a: "letter" };

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			// Numeric keys are sorted first
			expect(keys.map((k) => k.property)).toEqual(["0", "1", "10", "a"]);
		});

		it("should handle arrays", () => {
			const arr = [10, 20, 30];

			const keys = getObjectKeys(arr, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys.map((k) => k.property)).toEqual(["0", "1", "2"]);
		});

		it("should handle sparse arrays", () => {
			// biome-ignore lint/suspicious/noSparseArray: test
			const sparse = [1, , 3];

			const keys = getObjectKeys(sparse, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			// Holes are not enumerable
			expect(keys.map((k) => k.property)).toEqual(["0", "2"]);
		});

		it("should handle objects created with Object.create(null)", () => {
			const obj = Object.create(null);
			obj.prop = "value";

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: true,
			});

			expect(keys).toEqual([{ property: "prop", prototype: obj }]);
		});

		it("should handle frozen objects", () => {
			const obj = Object.freeze({ a: 1, b: 2 });

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys).toHaveLength(2);
		});

		it("should handle sealed objects", () => {
			const obj = Object.seal({ a: 1, b: 2 });

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys).toHaveLength(2);
		});

		it("should handle objects with only symbol keys", () => {
			const sym1 = Symbol("1");
			const sym2 = Symbol("2");
			const obj = { [sym1]: "a", [sym2]: "b" };

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: true,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys).toHaveLength(2);
			expect(keys.every((k) => typeof k.property === "symbol")).toBe(true);
		});

		it("should handle getters and setters", () => {
			const obj = {
				_value: 0,
				get value() {
					return this._value;
				},
				set value(v) {
					this._value = v;
				},
			};

			const keys = getObjectKeys(obj, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			expect(keys.map((k) => k.property)).toContain("_value");
			expect(keys.map((k) => k.property)).toContain("value");
		});

		it("should handle class instances", () => {
			class TestClass {
				public instanceProp = "instance";
				// biome-ignore lint/correctness/noUnusedPrivateClassMembers: test
				private privateProp = "private";

				method() {
					return "method";
				}
			}

			const instance = new TestClass();

			const keys = getObjectKeys(instance, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			// Only enumerable own properties
			expect(keys.map((k) => k.property)).toEqual(
				expect.arrayContaining(["instanceProp", "privateProp"]),
			);
		});

		it("should handle Date objects", () => {
			const date = new Date();

			const keys = getObjectKeys(date, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			// Date objects have no enumerable own properties
			expect(keys).toEqual([]);
		});

		it("should handle RegExp objects", () => {
			const regex = /test/gi;

			const keys = getObjectKeys(regex, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			// RegExp objects have no enumerable own properties by default
			expect(keys).toEqual([]);
		});

		it("should handle Map objects", () => {
			const map = new Map([
				["a", 1],
				["b", 2],
			]);

			const keys = getObjectKeys(map, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			// Map has no enumerable own properties (entries are internal)
			expect(keys).toEqual([]);
		});

		it("should handle Set objects", () => {
			const set = new Set([1, 2, 3]);

			const keys = getObjectKeys(set, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: false,
			});

			// Set has no enumerable own properties
			expect(keys).toEqual([]);
		});

		it("should preserve the prototype reference for each key", () => {
			const parent = { parentProp: "parent" };
			const child = Object.create(parent);
			child.childProp = "child";

			const keys = getObjectKeys(child, {
				includeSymbolKeys: false,
				includeNonEnumerable: false,
				includePrototypeChain: true,
			});

			const childKey = keys.find((k) => k.property === "childProp");
			const parentKey = keys.find((k) => k.property === "parentProp");

			expect(childKey?.prototype).toBe(child);
			expect(parentKey?.prototype).toBe(parent);
		});
	});
});
