import { expect, suite, test } from "vitest";

import { merge, mergeAll } from "./merge.js";

suite("mergeAll", () => {
	test("should fold sources left to right, the last winning", () => {
		expect(mergeAll([{ a: 1 }, { b: 2 }, { a: 3 }])).toEqual({ a: 3, b: 2 });
	});

	test("should return an empty object for no sources", () => {
		expect(mergeAll([])).toEqual({});
	});

	test("should copy a single source rather than return it", () => {
		const only = { a: 1 };

		const result = mergeAll([only]);

		expect(result).toEqual(only);
		expect(result).not.toBe(only);
	});

	test("should apply the options across the whole fold", () => {
		expect(
			mergeAll([{ a: [1] }, { a: [2] }, { a: [3] }], {
				recursive: true,
				arrayMergeMode: "spread",
			}),
		).toEqual({ a: [1, 2, 3] });
	});

	test("should stay shallow by default", () => {
		expect(mergeAll([{ a: { b: 1 } }, { a: { c: 2 } }])).toEqual({
			a: { c: 2 },
		});
	});

	test("should merge nested values across sources when recursive", () => {
		expect(
			mergeAll([{ a: { b: 1 } }, { a: { c: 2 } }, { a: { d: 3 } }], {
				recursive: true,
			}),
		).toEqual({ a: { b: 1, c: 2, d: 3 } });
	});
});

suite("merge", () => {
	suite("shallow (default)", () => {
		test("should take the source value whole for a key present in both", () => {
			const target = { a: 1, b: { c: 2 } };
			const source = { b: { d: 3 }, e: 4 };

			const result = merge(target, source);

			expect(result).not.toBe(target);
			expect(result).toEqual({ a: 1, b: { d: 3 }, e: 4 });
		});

		test("should not recurse into map values", () => {
			const target = new Map<string, unknown>([["b", { c: 2 }]]);
			const source = new Map<string, unknown>([["b", { d: 3 }]]);

			expect(merge(target, source)).toEqual(
				new Map<string, unknown>([["b", { d: 3 }]]),
			);
		});

		test("should not recurse into array elements under 'merge' mode", () => {
			const target = [{ a: 1 }, { b: 2 }];
			const source = [{ c: 3 }];

			expect(merge(target, source, { arrayMergeMode: "merge" })).toEqual([
				{ c: 3 },
				{ b: 2 },
			]);
		});
	});

	suite("recursive", () => {
		test("should merge plain objects", () => {
			const target = { a: 1, b: { c: 2 } };
			const source = { b: { d: 3 }, e: 4 };

			const result = merge(target, source, { recursive: true });

			expect(result).not.toBe(target);
			expect(result).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
		});

		test("should merge maps", () => {
			const target = new Map<string, unknown>([
				["a", 1],
				["b", { c: 2 }],
			]);
			const source = new Map<string, unknown>([
				["b", { d: 3 }],
				["e", 4],
			]);

			const result = merge(target, source, { recursive: true });

			expect(result).not.toBe(target);
			expect(result).toEqual(
				new Map<string, unknown>([
					["a", 1],
					["b", { c: 2, d: 3 }],
					["e", 4],
				]),
			);
		});

		test("should union sets", () => {
			const target = new Set<number | object>([1, 2, { a: 3 }]);
			const source = new Set<number | object>([{ b: 4 }, 5]);

			const result = merge(target, source, { recursive: true });

			expect(result).not.toBe(target);
			expect(result).toEqual(
				new Set<number | object>([1, 2, { a: 3 }, { b: 4 }, 5]),
			);
		});
	});

	suite("arrayMergeMode", () => {
		test("should replace by default", () => {
			expect(merge([1, 2, 3], [4, 5])).toEqual([4, 5]);
		});

		test("should append under 'spread'", () => {
			expect(merge([1, 2, 3], [4, 5], { arrayMergeMode: "spread" })).toEqual([
				1, 2, 3, 4, 5,
			]);
		});

		test("should overlay element-wise under 'merge'", () => {
			expect(merge([1, 2, 3], [4, 5], { arrayMergeMode: "merge" })).toEqual([
				4, 5, 3,
			]);
		});

		test("should merge nested elements under 'merge' when recursive", () => {
			const target0 = { a: 1 };
			const target1 = { b: 2 };
			const target2 = { c: 3 };
			const target = [target0, target1, target2];
			const source = [{ a: 4 }, { d: 5 }];

			const result = merge(target, source, {
				recursive: true,
				arrayMergeMode: "merge",
			});

			expect(result).toEqual([{ a: 4 }, { b: 2, d: 5 }, { c: 3 }]);
			expect(result[0]).not.toBe(target0);
			expect(result[1]).not.toBe(target1);
			expect(result[2]).not.toBe(target2);
		});
	});

	suite("non-mergeable pairs", () => {
		test("should return source for a non-object-like target", () => {
			const source = { a: 1 };

			expect(merge(1, source)).toBe(source);
		});

		test("should return source when target and source are different kinds", () => {
			const source = [1, 2, 3];

			expect(merge({ a: 1 }, source)).toBe(source);
		});

		test("should return source when it is not a plain object", () => {
			const target = { a: 1, b: { c: 2 } };

			for (const source of [
				new Date(),
				/test/,
				null,
				undefined,
				() => {},
				new Error(),
			]) {
				expect(merge(target, source)).toBe(source);
			}
		});
	});

	suite("cloneSource", () => {
		test("should copy source values when true", () => {
			const target = { a: 1 };
			const source = { b: { d: 3 } };

			const result = merge(target, source, { cloneSource: true });

			expect(result).not.toBe(target);
			expect(result.b).not.toBe(source.b);
			expect(result.b).toEqual(source.b);
		});

		test("should share source values when false", () => {
			const target = { a: 1 };
			const source = { b: { d: 3 } };

			const result = merge(target, source, { cloneSource: false });

			expect(result).not.toBe(target);
			expect(result.b).toBe(source.b);
		});
	});
});
