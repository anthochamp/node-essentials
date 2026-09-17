import { describe, expect, it } from "vitest";

import { flattenRecord } from "./flatten-record.js";

describe("flattenRecord", () => {
	it("should join nested keys with the default delimiter", () => {
		expect(
			flattenRecord({
				key1: { keyA: "valueI" },
				key2: { keyB: "valueII" },
				key3: { a: { b: { c: 2 } } },
			}),
		).toStrictEqual({
			"key1.keyA": "valueI",
			"key2.keyB": "valueII",
			"key3.a.b.c": 2,
		});
	});

	it("should use a custom delimiter", () => {
		expect(flattenRecord({ a: { b: 1 } }, { delimiter: "/" })).toStrictEqual({
			"a/b": 1,
		});
	});

	it("should reject an empty delimiter", () => {
		expect(() => flattenRecord({ a: 1 }, { delimiter: "" })).toThrow(
			RangeError,
		);
	});

	it("should leave an array whole by default", () => {
		const source = {
			this: [{ contains: "arrays" }, { preserving: { them: "for you" } }],
		};

		expect(flattenRecord(source)).toStrictEqual({
			this: [{ contains: "arrays" }, { preserving: { them: "for you" } }],
		});
	});

	it("should number array elements when asked", () => {
		expect(
			flattenRecord({ a: [1, { b: 2 }] }, { flattenArrays: true }),
		).toStrictEqual({ "a.0": 1, "a.1.b": 2 });
	});

	it("should keep an empty object or array as a leaf", () => {
		expect(
			flattenRecord({ a: {}, b: [], c: { d: {} } }, { flattenArrays: true }),
		).toStrictEqual({ a: {}, b: [], "c.d": {} });
	});

	it("should treat a non-plain object as a leaf", () => {
		const date = new Date(0);
		const map = new Map([["k", "v"]]);

		expect(flattenRecord({ a: { date, map } })).toStrictEqual({
			"a.date": date,
			"a.map": map,
		});
	});

	it("should stop at maxDepth", () => {
		expect(
			flattenRecord(
				{ key1: { keyA: "valueI" }, key3: { a: { b: { c: 2 } } } },
				{ maxDepth: 2 },
			),
		).toStrictEqual({ "key1.keyA": "valueI", "key3.a": { b: { c: 2 } } });
	});

	it("should flatten nothing at maxDepth 1", () => {
		const source = { a: { b: 1 } };

		expect(flattenRecord(source, { maxDepth: 1 })).toStrictEqual(source);
	});

	it("should reject a maxDepth below 1", () => {
		expect(() => flattenRecord({ a: 1 }, { maxDepth: 0 })).toThrow(RangeError);
		expect(() => flattenRecord({ a: 1 }, { maxDepth: Number.NaN })).toThrow(
			RangeError,
		);
	});

	it("should keep an empty segment for an empty key", () => {
		expect(flattenRecord({ "": { a: 1 } })).toStrictEqual({ ".a": 1 });
	});

	it("should not escape a key containing the delimiter", () => {
		expect(flattenRecord({ "a.b": { c: 1 } })).toStrictEqual({ "a.b.c": 1 });
	});

	it("should let a later colliding key win", () => {
		expect(flattenRecord({ "a.b": 1, a: { b: 2 } })).toStrictEqual({
			"a.b": 2,
		});
	});

	it("should ignore inherited keys", () => {
		const source = Object.create({ inherited: "no" }) as Record<
			string,
			unknown
		>;
		source["own"] = { deep: "yes" };

		expect(flattenRecord(source)).toStrictEqual({ "own.deep": "yes" });
	});

	it("should not modify the source", () => {
		const source = { a: { b: 1 } };

		flattenRecord(source);

		expect(source).toStrictEqual({ a: { b: 1 } });
	});
});
