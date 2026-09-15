import { expect, suite, test } from "vitest";

import { isDeepEqual } from "./is-deep-equal.js";

suite("isDeepEqual — strict (default)", () => {
	test("equal primitives", () => {
		expect(isDeepEqual(42, 42)).toBe(true);
		expect(isDeepEqual("x", "x")).toBe(true);
		expect(isDeepEqual(true, true)).toBe(true);
	});

	test("unequal primitives", () => {
		expect(isDeepEqual(1, 2)).toBe(false);
		expect(isDeepEqual("a", "b")).toBe(false);
		expect(isDeepEqual(1, "1")).toBe(false);
	});

	test("null and undefined", () => {
		expect(isDeepEqual(null, null)).toBe(true);
		expect(isDeepEqual(undefined, undefined)).toBe(true);
		expect(isDeepEqual(null, undefined)).toBe(false);
		expect(isDeepEqual(null, 0)).toBe(false);
	});

	test("NaN: strict does not equal NaN", () => {
		expect(isDeepEqual(NaN, NaN)).toBe(false);
		expect(isDeepEqual({ n: NaN }, { n: NaN })).toBe(false);
	});

	test("+0 and -0: strict treats them as equal", () => {
		expect(isDeepEqual(+0, -0)).toBe(true);
		expect(isDeepEqual({ n: -0 }, { n: +0 })).toBe(true);
	});

	test("plain objects — equal", () => {
		expect(isDeepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
	});

	test("plain objects — unequal value", () => {
		expect(isDeepEqual({ a: 1 }, { a: 2 })).toBe(false);
	});

	test("plain objects — different keys", () => {
		expect(isDeepEqual({ a: 1 }, { b: 1 })).toBe(false);
	});

	test("plain objects — extra key", () => {
		expect(isDeepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
	});

	test("nested objects", () => {
		expect(isDeepEqual({ a: { b: { c: 3 } } }, { a: { b: { c: 3 } } })).toBe(
			true,
		);
		expect(isDeepEqual({ a: { b: { c: 3 } } }, { a: { b: { c: 4 } } })).toBe(
			false,
		);
	});

	test("arrays — equal", () => {
		expect(isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
	});

	test("arrays — unequal element", () => {
		expect(isDeepEqual([1, 2], [1, 3])).toBe(false);
	});

	test("arrays — different length", () => {
		expect(isDeepEqual([1, 2], [1, 2, 3])).toBe(false);
	});

	test("arrays with nested objects", () => {
		expect(isDeepEqual([{ a: 1 }], [{ a: 1 }])).toBe(true);
		expect(isDeepEqual([{ a: 1 }], [{ a: 2 }])).toBe(false);
	});

	test("Date — equal timestamps", () => {
		expect(isDeepEqual(new Date(2024, 0, 1), new Date(2024, 0, 1))).toBe(true);
	});

	test("Date — different timestamps", () => {
		expect(isDeepEqual(new Date(2024, 0, 1), new Date(2024, 0, 2))).toBe(false);
	});

	test("Date vs non-Date", () => {
		expect(isDeepEqual(new Date(0), 0)).toBe(false);
		expect(isDeepEqual(new Date(0), {})).toBe(false);
	});

	test("RegExp — equal", () => {
		expect(isDeepEqual(/abc/gi, /abc/gi)).toBe(true);
	});

	test("RegExp — different source", () => {
		expect(isDeepEqual(/abc/, /xyz/)).toBe(false);
	});

	test("RegExp — different flags", () => {
		expect(isDeepEqual(/abc/g, /abc/i)).toBe(false);
	});

	test("Map — equal entries", () => {
		expect(isDeepEqual(new Map([["a", 1]]), new Map([["a", 1]]))).toBe(true);
	});

	test("Map — unequal values", () => {
		expect(isDeepEqual(new Map([["a", 1]]), new Map([["a", 2]]))).toBe(false);
	});

	test("Map — missing key", () => {
		expect(isDeepEqual(new Map([["a", 1]]), new Map([["b", 1]]))).toBe(false);
	});

	test("Map — different sizes", () => {
		expect(
			isDeepEqual(
				new Map([["a", 1]]),
				new Map([
					["a", 1],
					["b", 2],
				]),
			),
		).toBe(false);
	});

	test("Set — equal members (order independent)", () => {
		expect(isDeepEqual(new Set([1, 2, 3]), new Set([3, 2, 1]))).toBe(true);
	});

	test("Set — unequal members", () => {
		expect(isDeepEqual(new Set([1, 2]), new Set([1, 3]))).toBe(false);
	});

	test("Set — different sizes", () => {
		expect(isDeepEqual(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false);
	});

	test("circular references with equal structure", () => {
		const a: Record<string, unknown> = { x: 1 };
		a.self = a;
		const b: Record<string, unknown> = { x: 1 };
		b.self = b;
		expect(isDeepEqual(a, b)).toBe(true);
	});

	test("circular references with different structure", () => {
		const a: Record<string, unknown> = { x: 1 };
		a.self = a;
		const b: Record<string, unknown> = { x: 2 };
		b.self = b;
		expect(isDeepEqual(a, b)).toBe(false);
	});

	test("type mismatch: array vs plain object", () => {
		expect(isDeepEqual([], {})).toBe(false);
	});

	test("type mismatch: Date vs plain object", () => {
		expect(isDeepEqual(new Date(), {})).toBe(false);
	});

	test("type mismatch: Map vs plain object", () => {
		expect(isDeepEqual(new Map(), {})).toBe(false);
	});

	test("Object.create(null) as plain object", () => {
		const a = Object.create(null) as Record<string, unknown>;
		a.x = 1;
		const b = Object.create(null) as Record<string, unknown>;
		b.x = 1;
		expect(isDeepEqual(a, b)).toBe(true);
	});
});

suite("isDeepEqual — loose", () => {
	test("numeric string matches number in nested value", () => {
		expect(isDeepEqual({ a: 1 }, { a: "1" }, "loose")).toBe(true);
		expect(isDeepEqual({ a: 1 }, { a: "2" }, "loose")).toBe(false);
	});

	test("null == undefined", () => {
		expect(isDeepEqual(null, undefined, "loose")).toBe(true);
	});

	test("0 == false", () => {
		expect(isDeepEqual(0, false, "loose")).toBe(true);
	});

	test("equal arrays stay equal", () => {
		expect(isDeepEqual([1, 2], [1, 2], "loose")).toBe(true);
	});
});

suite("isDeepEqual — sameValue", () => {
	test("NaN equals NaN", () => {
		expect(isDeepEqual(NaN, NaN, "sameValue")).toBe(true);
		expect(isDeepEqual({ n: NaN }, { n: NaN }, "sameValue")).toBe(true);
	});

	test("-0 does not equal +0", () => {
		expect(isDeepEqual(-0, +0, "sameValue")).toBe(false);
		expect(isDeepEqual({ n: -0 }, { n: +0 }, "sameValue")).toBe(false);
	});

	test("+0 equals +0", () => {
		expect(isDeepEqual(+0, +0, "sameValue")).toBe(true);
	});

	test("-0 equals -0", () => {
		expect(isDeepEqual(-0, -0, "sameValue")).toBe(true);
	});
});

suite("isDeepEqual — sameValueZero", () => {
	test("NaN equals NaN", () => {
		expect(isDeepEqual(NaN, NaN, "sameValueZero")).toBe(true);
		expect(isDeepEqual({ n: NaN }, { n: NaN }, "sameValueZero")).toBe(true);
	});

	test("-0 equals +0", () => {
		expect(isDeepEqual(-0, +0, "sameValueZero")).toBe(true);
		expect(isDeepEqual({ n: -0 }, { n: +0 }, "sameValueZero")).toBe(true);
	});
});

suite("isDeepEqual — predicate", () => {
	test("case-insensitive string comparison in nested object", () => {
		const caseInsensitive = (a: unknown, b: unknown): boolean =>
			typeof a === "string" && typeof b === "string"
				? a.toLowerCase() === b.toLowerCase()
				: a === b;

		expect(
			isDeepEqual({ name: "Alice" }, { name: "alice" }, caseInsensitive),
		).toBe(true);
		expect(
			isDeepEqual({ name: "Alice" }, { name: "Bob" }, caseInsensitive),
		).toBe(false);
	});

	test("custom Date comparison: same calendar day regardless of time", () => {
		const sameDay = (a: unknown, b: unknown): boolean => {
			if (a instanceof Date && b instanceof Date) {
				return a.toDateString() === b.toDateString();
			}
			return a === b;
		};
		const morning = new Date(2024, 0, 1, 8, 0);
		const evening = new Date(2024, 0, 1, 22, 0);
		const nextDay = new Date(2024, 0, 2, 8, 0);

		expect(isDeepEqual(morning, evening, sameDay)).toBe(true);
		expect(isDeepEqual(morning, nextDay, sameDay)).toBe(false);
	});

	test("predicate applied to Set members", () => {
		const alwaysTrue = () => true;
		expect(isDeepEqual(new Set([1]), new Set([99]), alwaysTrue)).toBe(true);
	});
});
