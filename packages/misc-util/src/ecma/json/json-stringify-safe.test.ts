import { describe, expect, it } from "vitest";
import { jsonStringifySafe } from "./json-stringify-safe.js";

describe("jsonStringifySafe", () => {
	it("should stringify a simple object", () => {
		const obj = { a: 1, b: "test", c: true };
		const result = jsonStringifySafe(obj);
		expect(result).toBe(JSON.stringify(obj));
	});

	it("should handle circular references", () => {
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj: any = { a: 1 };
		obj.self = obj;
		const result = jsonStringifySafe(obj);
		expect(result).toBe('{"a":1,"self":"[Circular]"}');
	});

	it("should handle nested circular references", () => {
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj: any = { a: { b: { c: {} } } };
		obj.a.b.c.self = obj.a;
		const result = jsonStringifySafe(obj);
		expect(result).toBe('{"a":{"b":{"c":{"self":"[Circular]"}}}}');
	});

	it("should handle arrays with circular references", () => {
		// biome-ignore lint/suspicious/noExplicitAny: test
		const arr: any[] = [1, 2, 3];
		arr.push(arr);
		const result = jsonStringifySafe(arr);
		expect(result).toBe('[1,2,3,"[Circular]"]');
	});

	it("should handle complex objects with multiple circular references", () => {
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj: any = { name: "root" };
		obj.child1 = { name: "child1", parent: obj };
		obj.child2 = { name: "child2", parent: obj };
		const result = jsonStringifySafe(obj);
		expect(result).toBe(
			'{"name":"root","child1":{"name":"child1","parent":"[Circular]"},"child2":{"name":"child2","parent":"[Circular]"}}',
		);
	});

	it("should return undefined for functions and symbols", () => {
		const obj = {
			func: () => {},
			sym: Symbol("test"),
			num: 42,
			str: "hello",
		};
		const result = jsonStringifySafe(obj);
		expect(result).toBe('{"num":42,"str":"hello"}');
	});

	it("should handle null and undefined values correctly", () => {
		const obj = {
			a: null,
			b: undefined,
			c: "test",
		};
		const result = jsonStringifySafe(obj);
		expect(result).toBe('{"a":null,"c":"test"}');
	});

	it("should handle Date objects", () => {
		const date = new Date("2023-01-01T00:00:00Z");
		const obj = { date };
		const result = jsonStringifySafe(obj);
		expect(result).toBe(`{"date":"${date.toISOString()}"}`);
	});

	it("should handle objects with toJSON methods", () => {
		const obj = {
			a: 1,
			b: {
				toJSON: () => "custom",
			},
		};
		const result = jsonStringifySafe(obj);
		expect(result).toBe('{"a":1,"b":"custom"}');
	});

	it("should handle deeply nested objects with circular references", () => {
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj: any = { level1: { level2: { level3: {} } } };
		obj.level1.level2.level3.self = obj.level1;
		const result = jsonStringifySafe(obj);
		expect(result).toBe(
			'{"level1":{"level2":{"level3":{"self":"[Circular]"}}}}',
		);
	});

	it("should handle large objects with multiple circular references", () => {
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj: any = { a: 1, b: 2 };
		obj.self = obj;
		obj.nested = { parent: obj };
		const result = jsonStringifySafe(obj);
		expect(result).toBe(
			'{"a":1,"b":2,"self":"[Circular]","nested":{"parent":"[Circular]"}}',
		);
	});

	it.skip("should handle arrays of objects with circular references", () => {
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj1: any = { name: "obj1" };
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj2: any = { name: "obj2", ref: obj1 };
		obj1.ref = obj2;
		const arr = [obj1, obj2];
		const result = jsonStringifySafe(arr);
		expect(result).toBe(
			'[{"name":"obj1","ref":{"name":"obj2","ref":"[Circular]"}},{"name":"obj2","ref":{"name":"obj1","ref":"[Circular]"}}]',
		);
	});

	it("should handle mixed data types with circular references", () => {
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj: any = {
			num: 1,
			str: "test",
			bool: true,
			arr: [1, 2, 3],
			nested: { a: "b" },
		};
		obj.self = obj;
		const result = jsonStringifySafe(obj);
		expect(result).toBe(
			'{"num":1,"str":"test","bool":true,"arr":[1,2,3],"nested":{"a":"b"},"self":"[Circular]"}',
		);
	});

	it("should handle objects with non-enumerable properties", () => {
		const obj = { a: 1 };
		Object.defineProperty(obj, "b", {
			value: 2,
			enumerable: false,
		});
		const result = jsonStringifySafe(obj);
		expect(result).toBe('{"a":1}');
	});
	it("should handle objects with symbol properties", () => {
		const sym = Symbol("test");
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj: any = { a: 1 };
		obj[sym] = 2;
		const result = jsonStringifySafe(obj);
		expect(result).toBe('{"a":1}');
	});
	it("should handle objects with large depth", () => {
		const createDeepObject = (depth: number): unknown => {
			if (depth === 0) return { value: "end" };
			return { next: createDeepObject(depth - 1) };
		};
		const obj = createDeepObject(1000);
		const result = jsonStringifySafe(obj);
		expect(result).toBeDefined();
	});
	it("should handle objects with circular references in arrays", () => {
		// biome-ignore lint/suspicious/noExplicitAny: test
		const obj: any = { name: "root" };
		const arr = [obj];
		obj.arr = arr;
		const result = jsonStringifySafe(obj);
		expect(result).toBe('{"name":"root","arr":["[Circular]"]}');
	});
});
