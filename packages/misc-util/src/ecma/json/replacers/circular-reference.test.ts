/** biome-ignore-all lint/style/noNonNullAssertion: tests */
import { describe, expect, it } from "vitest";
import { jsonMakeCircularReferenceReplacerFunction } from "./circular-reference.js";

describe("jsonMakeCircularReferenceReplacerFunction", () => {
	it("should replace circular references with the default placeholder", () => {
		const replacer = jsonMakeCircularReferenceReplacerFunction();
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj: any = { a: 1 };
		obj.self = obj;
		const result = JSON.parse(JSON.stringify(obj, replacer)!);
		expect(result).toEqual({ a: 1, self: "[Circular]" });
	});

	it("should replace circular references with a custom placeholder", () => {
		const replacer = jsonMakeCircularReferenceReplacerFunction(undefined, {
			placeholder: "[CIRCULAR_REF]",
		});
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj: any = { a: 1 };
		obj.self = obj;
		const result = JSON.parse(JSON.stringify(obj, replacer)!);
		expect(result).toEqual({ a: 1, self: "[CIRCULAR_REF]" });
	});

	it("should not modify non-circular objects", () => {
		const replacer = jsonMakeCircularReferenceReplacerFunction();
		const obj = { a: 1, b: { c: 2 } };
		const result = JSON.parse(JSON.stringify(obj, replacer)!);
		expect(result).toEqual(obj);
	});

	it("should work with nested circular references", () => {
		const replacer = jsonMakeCircularReferenceReplacerFunction();
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj: any = { a: 1 };
		obj.self = obj;
		obj.nested = { parent: obj };
		const result = JSON.parse(JSON.stringify(obj, replacer)!);
		expect(result).toEqual({
			a: 1,
			self: "[Circular]",
			nested: { parent: "[Circular]" },
		});
	});

	it("should work with arrays containing circular references", () => {
		const replacer = jsonMakeCircularReferenceReplacerFunction();
		// biome-ignore lint/suspicious/noExplicitAny: test
		const arr: any[] = [1, 2];
		arr.push(arr);
		const result = JSON.parse(JSON.stringify(arr, replacer)!);
		expect(result).toEqual([1, 2, "[Circular]"]);
	});

	it("should work with complex objects containing circular references", () => {
		const replacer = jsonMakeCircularReferenceReplacerFunction();
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj: any = { name: "Alice" };
		obj.self = obj;
		obj.friends = [{ name: "Bob", friend: obj }];
		const result = JSON.parse(JSON.stringify(obj, replacer)!);
		expect(result).toEqual({
			name: "Alice",
			self: "[Circular]",
			friends: [{ name: "Bob", friend: "[Circular]" }],
		});
	});

	it("should not replace reference to the same object if it is not circular", () => {
		const replacer = jsonMakeCircularReferenceReplacerFunction();
		const sharedObj = { value: 42 };
		const obj = { a: sharedObj, b: sharedObj };
		const result = JSON.parse(JSON.stringify(obj, replacer)!);
		expect(result).toEqual({ a: { value: 42 }, b: { value: 42 } });
	});
});
