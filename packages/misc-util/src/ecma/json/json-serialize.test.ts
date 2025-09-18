/** biome-ignore-all lint/suspicious/noExplicitAny: tests */
import { expect, suite, test, vi } from "vitest";
import { jsonSerialize } from "./json-serialize.js";

suite("jsonSerialize", () => {
	test("should serialize primitive values correctly", () => {
		expect(jsonSerialize(null)).toBeNull();
		expect(jsonSerialize(true)).toBe(true);
		expect(jsonSerialize(false)).toBe(false);
		expect(jsonSerialize(42)).toBe(42);
		expect(jsonSerialize("Hello, World!")).toBe("Hello, World!");
		expect(jsonSerialize(undefined)).toBeUndefined();
	});

	test("should serialize arrays correctly", () => {
		const arr = [1, "two", null, true, undefined];
		expect(jsonSerialize(arr)).toEqual([1, "two", null, true, null]);
	});

	test("should serialize plain objects correctly", () => {
		const obj = {
			num: 1,
			str: "two",
			bool: true,
			nil: null,
			undef: undefined,
			nested: { a: 1, b: "two" },
			arr: [1, 2, 3],
		};
		expect(jsonSerialize(obj)).toEqual({
			num: 1,
			str: "two",
			bool: true,
			nil: null,
			nested: { a: 1, b: "two" },
			arr: [1, 2, 3],
		});
	});

	test("should handle toJSON methods correctly", () => {
		const obj = {
			value: 42,
			toJSON() {
				return { value: this.value * 2 };
			},
		};
		expect(jsonSerialize(obj)).toEqual({ value: 84 });
	});

	test("should handle circular references by throwing an error", () => {
		const obj: any = {};
		obj.self = obj;
		expect(() => jsonSerialize(obj)).toThrow(TypeError);
	});

	test("should handle big integer by throwing an error", () => {
		const obj = { big: BigInt(10) };
		expect(() => jsonSerialize(obj)).toThrow(TypeError);
	});

	test("should use the replacer function if provided", () => {
		const obj = { a: 1, b: 2, c: 3 };
		const replacer: JsonReplacer = (_key, value) => {
			if (typeof value === "number") {
				return value * 10;
			}
			return value;
		};
		expect(jsonSerialize(obj, replacer)).toEqual({ a: 10, b: 20, c: 30 });
	});

	test("should return undefined for non-serializable values", () => {
		expect(jsonSerialize(() => {})).toBeUndefined();
		expect(jsonSerialize(Symbol("sym"))).toBeUndefined();
	});

	test("should call the replacer function with correct arguments", () => {
		const obj = { a: 1, b: 2 };
		const replacer = vi.fn((_key, value) => value);
		jsonSerialize(obj, replacer);
		expect(replacer).toHaveBeenCalled();
		expect(replacer).toHaveBeenCalledWith("", obj);
		expect(replacer).toHaveBeenCalledWith("a", 1);
		expect(replacer).toHaveBeenCalledWith("b", 2);
	});
});
