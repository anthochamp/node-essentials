import { describe, expect, it } from "vitest";

import type { DataValue } from "./ast.js";
import { dataValueToJson, jsonToDataValue } from "./json-bridge.js";

describe("dataValueToJson", () => {
	it("converts numbers, text, booleans, and null", () => {
		expect(dataValueToJson({ kind: "int", value: 42n })).toBe(42);
		expect(dataValueToJson({ kind: "float", value: 1.5 })).toBe(1.5);
		expect(dataValueToJson({ kind: "text", value: "hi" })).toBe("hi");
		expect(dataValueToJson({ kind: "bool", value: true })).toBe(true);
		expect(dataValueToJson({ kind: "null" })).toBeNull();
	});

	it("substitutes null for non-finite floats, undefined, and simple values", () => {
		expect(dataValueToJson({ kind: "float", value: Infinity })).toBeNull();
		expect(dataValueToJson({ kind: "float", value: Number.NaN })).toBeNull();
		expect(dataValueToJson({ kind: "undefined" })).toBeNull();
		expect(dataValueToJson({ kind: "simple", value: 16 })).toBeNull();
	});

	it("converts byte strings to base64url without padding", () => {
		expect(
			dataValueToJson({
				kind: "bytes",
				value: new TextEncoder().encode("hello"),
			}),
		).toBe("aGVsbG8");
	});

	it("converts arrays and maps recursively", () => {
		const value: DataValue = {
			kind: "array",
			items: [
				{
					kind: "map",
					entries: [
						[
							{ kind: "text", value: "a" },
							{ kind: "int", value: 1n },
						],
					],
				},
			],
		};
		expect(dataValueToJson(value)).toEqual([{ a: 1 }]);
	});

	it("ignores the tag number and converts the tag content", () => {
		expect(
			dataValueToJson({
				kind: "tag",
				tag: 0n,
				value: { kind: "text", value: "x" },
			}),
		).toBe("x");
	});

	it("throws for a map with a non-text-string key", () => {
		expect(() =>
			dataValueToJson({
				kind: "map",
				entries: [
					[
						{ kind: "int", value: 1n },
						{ kind: "int", value: 2n },
					],
				],
			}),
		).toThrow();
	});
});

describe("jsonToDataValue", () => {
	it("converts primitives", () => {
		expect(jsonToDataValue(42)).toEqual({ kind: "int", value: 42n });
		expect(jsonToDataValue(1.5)).toEqual({ kind: "float", value: 1.5 });
		expect(jsonToDataValue("hi")).toEqual({ kind: "text", value: "hi" });
		expect(jsonToDataValue(true)).toEqual({ kind: "bool", value: true });
		expect(jsonToDataValue(null)).toEqual({ kind: "null" });
	});

	it("converts an integral number within the safe-integer range to int", () => {
		expect(jsonToDataValue(Number.MAX_SAFE_INTEGER)).toEqual({
			kind: "int",
			value: BigInt(Number.MAX_SAFE_INTEGER),
		});
	});

	it("converts an integral number beyond the safe-integer range to float", () => {
		expect(jsonToDataValue(Number.MAX_SAFE_INTEGER * 2)).toEqual({
			kind: "float",
			value: Number.MAX_SAFE_INTEGER * 2,
		});
	});

	it("converts arrays and objects recursively", () => {
		expect(jsonToDataValue([{ a: 1 }])).toEqual({
			kind: "array",
			items: [
				{
					kind: "map",
					entries: [
						[
							{ kind: "text", value: "a" },
							{ kind: "int", value: 1n },
						],
					],
				},
			],
		});
	});
});
