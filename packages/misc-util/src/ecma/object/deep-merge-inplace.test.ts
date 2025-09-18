import { expect, suite, test } from "vitest";
import {
	deepMergeArrayInplace,
	deepMergeInplace,
	deepMergeMapInplace,
	deepMergePojoInplace,
	deepMergeSetInplace,
} from "./deep-merge-inplace.js";

suite("deepMergeInplace", () => {
	suite("deepMergeInplace", () => {
		test("should merge plain objects in place", () => {
			const target = { a: 1, b: { c: 2 } };
			const source = { b: { d: 3 }, e: 4 };

			const result = deepMergeInplace(target, source);

			expect(result).toBe(target);
			expect(target).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
		});

		test("should merge arrays in place", () => {
			const target = [1, 2, 3];
			const source = [4, 5];

			const result = deepMergeInplace(target, source, {
				arrayMergeMode: "spread",
			});

			expect(result).toBe(target);
			expect(target).toEqual([1, 2, 3, 4, 5]);
		});

		test("should merge maps in place", () => {
			const target = new Map<string, unknown>([
				["a", 1],
				["b", { c: 2 }],
			]);
			const source = new Map<string, unknown>([
				["b", { d: 3 }],
				["e", 4],
			]);

			const result = deepMergeInplace(target, source);

			expect(result).toBe(target);
			expect(target).toEqual(
				new Map<string, unknown>([
					["a", 1],
					["b", { c: 2, d: 3 }],
					["e", 4],
				]),
			);
		});

		test("should merge sets in place", () => {
			const target = new Set<number | object>([1, 2, { a: 3 }]);
			const source = new Set<number | object>([{ b: 4 }, 5]);

			const result = deepMergeInplace(target, source);

			expect(result).toBe(target);
			expect(target).toEqual(
				new Set<number | object>([1, 2, { a: 3 }, { b: 4 }, 5]),
			);
		});

		test("should return source for non-object-like values", () => {
			const target = 1;
			const source = { a: 1 };

			const result = deepMergeInplace(target, source);

			expect(result).toBe(source);
		});

		test("should return source when target and source are of different types", () => {
			const target = { a: 1 };
			const source = [1, 2, 3];

			const result = deepMergeInplace(target, source);

			expect(result).toBe(source);
		});

		test("should return source when source is a non-recursive object", () => {
			const target = { a: 1, b: { c: 2 } };
			let source: unknown = new Date();

			const result = deepMergeInplace(target, source);
			expect(result).toBe(source);

			source = /test/;
			const result2 = deepMergeInplace(target, source);
			expect(result2).toBe(source);

			source = null;
			const result3 = deepMergeInplace(target, source);
			expect(result3).toBe(source);

			source = undefined;
			const result4 = deepMergeInplace(target, source);
			expect(result4).toBe(source);

			source = () => {};
			const result5 = deepMergeInplace(target, source);
			expect(result5).toBe(source);

			source = new Error();
			const result6 = deepMergeInplace(target, source);
			expect(result6).toBe(source);
		});

		test("should clone source when cloneSource option is true", () => {
			const target = { a: 1 };
			const source = { b: { d: 3 } };

			const result = deepMergeInplace(target, source, {
				cloneSource: true,
			});

			expect(result).toBe(target);
			expect(result.b).not.toBe(source.b);
		});

		test("should not clone source when cloneSource option is false", () => {
			const target = { a: 1 };
			const source = { b: { d: 3 } };

			const result = deepMergeInplace(target, source, {
				cloneSource: false,
			});

			expect(result).toBe(target);
			expect(result.b).toBe(source.b);
		});
	});

	suite("deepMergePojoInplace", () => {
		test("should merge plain objects in place", () => {
			const target = { a: 1, b: { c: 2 } };
			const source = { b: { d: 3 }, e: 4 };

			deepMergePojoInplace(target, source);

			expect(target).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
		});
	});

	suite("deepMergeSetInplace", () => {
		test("should merge sets in place", () => {
			const target = new Set<number | object>([1, 2, { a: 3 }]);
			const source = new Set<number | object>([{ b: 4 }, 5]);

			deepMergeSetInplace(target, source);

			expect(target).toEqual(
				new Set<number | object>([1, 2, { a: 3 }, { b: 4 }, 5]),
			);
		});
	});

	suite("deepMergeMapInplace", () => {
		test("should merge maps in place", () => {
			const target = new Map<string, unknown>([
				["a", 1],
				["b", { c: 2 }],
			]);
			const source = new Map<string, unknown>([
				["b", { d: 3 }],
				["e", 4],
			]);

			deepMergeMapInplace(target, source);

			expect(target).toEqual(
				new Map<string, unknown>([
					["a", 1],
					["b", { c: 2, d: 3 }],
					["e", 4],
				]),
			);
		});
	});

	suite("deepMergeArrayInplace", () => {
		test("should merge arrays with 'replace' mode", () => {
			const target = [1, 2, 3];
			const source = [4, 5];
			deepMergeArrayInplace(target, source, {
				arrayMergeMode: "replace",
			});
			expect(target).toEqual([4, 5]);
		});

		test("should merge arrays with 'spread' mode", () => {
			const target = [1, 2, 3];
			const source = [4, 5];
			deepMergeArrayInplace(target, source, {
				arrayMergeMode: "spread",
			});
			expect(target).toEqual([1, 2, 3, 4, 5]);
		});

		test("should merge arrays with 'merge' mode", () => {
			const target = [1, 2, 3];
			const source = [4, 5];
			deepMergeArrayInplace(target, source, {
				arrayMergeMode: "merge",
			});
			expect(target).toEqual([4, 5, 3]);
		});

		test("should merge arrays with 'merge' mode and nested objects", () => {
			const target0 = { a: 1 };
			const target1 = { b: 2 };
			const target2 = { c: 3 };
			const target = [target0, target1, target2];
			const source = [{ a: 4 }, { d: 5 }];
			deepMergeArrayInplace(target, source, {
				arrayMergeMode: "merge",
			});
			expect(target).toEqual([{ a: 4 }, { b: 2, d: 5 }, { c: 3 }]);
			expect(target[0]).toBe(target0);
			expect(target[1]).toBe(target1);
			expect(target[2]).toBe(target2);
		});
	});
});
