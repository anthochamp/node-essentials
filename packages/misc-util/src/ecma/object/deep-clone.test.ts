import { describe, expect, it } from "vitest";
import { deepClone } from "./deep-clone.js";

describe("deepClone", () => {
	it("should deep clone plain objects", () => {
		const obj = { a: 1, b: { c: 2 } };
		const cloned = deepClone(obj);

		expect(cloned).toEqual(obj);
		expect(cloned).not.toBe(obj);
		expect(cloned.b).not.toBe(obj.b); // Deep clone, nested objects are different references
	});

	it("should deep clone arrays", () => {
		const arr = [1, 2, { a: 3 }];
		const cloned = deepClone(arr);

		expect(cloned).toEqual(arr);
		expect(cloned).not.toBe(arr);
		expect(cloned[2]).not.toBe(arr[2]); // Deep clone, nested objects are different references
	});

	it("should return primitives as is", () => {
		expect(deepClone(42)).toBe(42);
		expect(deepClone("hello")).toBe("hello");
		expect(deepClone(true)).toBe(true);
		expect(deepClone(null)).toBe(null);
		expect(deepClone(undefined)).toBe(undefined);
	});

	it("should clone Date objects", () => {
		const date = new Date();
		const cloned = deepClone(date);
		expect(cloned).not.toBe(date);
		expect(cloned).toEqual(date);
	});

	it("should clone RegExp objects", () => {
		const regex = /test/;
		const cloned = deepClone(regex);
		expect(cloned).not.toBe(regex);
		expect(cloned).toEqual(regex);
	});

	it("should deep clone Map objects", () => {
		const map = new Map();
		map.set("a", 1);
		map.set("b", { c: 2 });
		const cloned = deepClone(map);

		expect(cloned).not.toBe(map);
		expect(cloned).toEqual(map);
		expect(cloned.get("b")).not.toBe(map.get("b")); // Deep clone, nested objects are different references
	});

	it("should deep clone Set objects", () => {
		const set = new Set([1, 2, { a: 3 }]);
		const cloned = deepClone(set);

		expect(cloned).not.toBe(set);
		expect(cloned).toEqual(set);
		for (const item of cloned) {
			if (typeof item === "object") {
				expect(item).not.toBe(
					[...set].find((i) => typeof i === "object" && i.a === item.a),
				);
			}
		}
	});
});
