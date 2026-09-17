import { describe, expect, it } from "vitest";

import { flattenRecord } from "./flatten-record.js";
import { unflattenRecord } from "./unflatten-record.js";

describe("unflattenRecord", () => {
	it("should split keys on the default delimiter", () => {
		expect(
			unflattenRecord({
				"three.levels.deep": 42,
				"three.levels.nested": true,
			}),
		).toStrictEqual({ three: { levels: { deep: 42, nested: true } } });
	});

	it("should use a custom delimiter", () => {
		expect(unflattenRecord({ "a/b": 1 }, { delimiter: "/" })).toStrictEqual({
			a: { b: 1 },
		});
	});

	it("should reject an empty delimiter", () => {
		expect(() => unflattenRecord({ a: 1 }, { delimiter: "" })).toThrow(
			RangeError,
		);
	});

	it("should keep a numeric segment an object key by default", () => {
		expect(
			unflattenRecord({ "hello.you.0": "ipsum", "hello.you.1": "lorem" }),
		).toStrictEqual({ hello: { you: { "0": "ipsum", "1": "lorem" } } });
	});

	it("should rebuild an array when asked", () => {
		expect(
			unflattenRecord(
				{ "hello.you.0": "ipsum", "hello.you.1": "lorem" },
				{ buildArrays: true },
			),
		).toStrictEqual({ hello: { you: ["ipsum", "lorem"] } });
	});

	it("should keep a non-canonical index an object key", () => {
		expect(
			unflattenRecord({ "a.01": 1, "a.1e2": 2 }, { buildArrays: true }),
		).toStrictEqual({ a: { "01": 1, "1e2": 2 } });
	});

	it("should replace a scalar that a deeper key needs as a container", () => {
		expect(
			unflattenRecord({ TRAVIS: "true", "TRAVIS.DIR": "/home/travis" }),
		).toStrictEqual({ TRAVIS: { DIR: "/home/travis" } });
	});

	it("should let a later key win over an earlier container", () => {
		expect(
			unflattenRecord({ "TRAVIS.DIR": "/home/travis", TRAVIS: "true" }),
		).toStrictEqual({ TRAVIS: "true" });
	});

	it("should keep a single-segment key verbatim", () => {
		expect(unflattenRecord({ "": 1, a: 2 })).toStrictEqual({ "": 1, a: 2 });
	});

	it("should not modify the source", () => {
		const source = { "a.b": 1 };

		unflattenRecord(source);

		expect(source).toStrictEqual({ "a.b": 1 });
	});
});

describe("flattenRecord/unflattenRecord round trip", () => {
	const cases: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
		["an empty record", {}],
		["a flat record", { a: 1, b: "two", c: null }],
		["a nested record", { a: { b: { c: 1 } }, d: 2 }],
		["an empty container", { a: {}, b: { c: {} } }],
		["an array leaf", { a: [1, 2, { b: 3 }], c: { d: [] } }],
		["an empty key", { "": { "": 1 } }],
		["a key holding undefined", { a: { b: undefined } }],
	];

	for (const [label, source] of cases) {
		it(`should round trip ${label}`, () => {
			expect(unflattenRecord(flattenRecord(source))).toStrictEqual(source);
		});
	}

	it("should round trip a numbered array through buildArrays", () => {
		const source = { a: { b: [1, 2] } };

		expect(
			unflattenRecord(flattenRecord(source, { flattenArrays: true }), {
				buildArrays: true,
			}),
		).toStrictEqual(source);
	});

	it("should resolve a key containing the delimiter as nesting", () => {
		// The documented ambiguity: the delimiter wins, so the round trip is lossy
		// for a key that legitimately contains one.
		expect(unflattenRecord(flattenRecord({ "a.b": 1 }))).toStrictEqual({
			a: { b: 1 },
		});
	});

	it("should round trip a delimiter-bearing key under a delimiter it cannot hold", () => {
		const source = { "a.b": { "c.d": 1 } };

		expect(
			unflattenRecord(flattenRecord(source, { delimiter: "\u0000" }), {
				delimiter: "\u0000",
			}),
		).toStrictEqual(source);
	});
});
