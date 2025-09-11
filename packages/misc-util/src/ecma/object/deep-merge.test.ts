import { describe, expect, it } from "vitest";
import {
	deepMerge,
	deepMergeArray,
	deepMergeMap,
	deepMergePojo,
	deepMergeSet,
} from "./deep-merge.js";

describe("deepMerge", () => {
	describe("deepMerge", () => {
		it("should merge plain objects in place", () => {
			const target = { a: 1, b: { c: 2 } };
			const source = { b: { d: 3 }, e: 4 };

			const result = deepMerge(target, source);

			expect(result).not.toBe(target);
			expect(result).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
		});

		it("should merge arrays in place", () => {
			const target = [1, 2, 3];
			const source = [4, 5];

			const result = deepMerge(target, source, {
				arrayMergeMode: "spread",
			});

			expect(result).not.toBe(target);
			expect(result).toEqual([1, 2, 3, 4, 5]);
		});

		it("should merge maps in place", () => {
			const target = new Map<string, unknown>([
				["a", 1],
				["b", { c: 2 }],
			]);
			const source = new Map<string, unknown>([
				["b", { d: 3 }],
				["e", 4],
			]);

			const result = deepMerge(target, source);

			expect(result).not.toBe(target);
			expect(result).toEqual(
				new Map<string, unknown>([
					["a", 1],
					["b", { c: 2, d: 3 }],
					["e", 4],
				]),
			);
		});

		it("should merge sets in place", () => {
			const target = new Set<number | object>([1, 2, { a: 3 }]);
			const source = new Set<number | object>([{ b: 4 }, 5]);

			const result = deepMerge(target, source);

			expect(result).not.toBe(target);
			expect(result).toEqual(
				new Set<number | object>([1, 2, { a: 3 }, { b: 4 }, 5]),
			);
		});

		it("should return source for non-object-like values", () => {
			const target = 1;
			const source = { a: 1 };

			const result = deepMerge(target, source);

			expect(result).toBe(source);
		});

		it("should return source when target and source are of different types", () => {
			const target = { a: 1 };
			const source = [1, 2, 3];

			const result = deepMerge(target, source);

			expect(result).toBe(source);
		});

		it("should return source when source is a non-recursive object", () => {
			const target = { a: 1, b: { c: 2 } };
			let source: unknown = new Date();

			const result = deepMerge(target, source);
			expect(result).toBe(source);

			source = /test/;
			const result2 = deepMerge(target, source);
			expect(result2).toBe(source);

			source = null;
			const result3 = deepMerge(target, source);
			expect(result3).toBe(source);

			source = undefined;
			const result4 = deepMerge(target, source);
			expect(result4).toBe(source);

			source = () => {};
			const result5 = deepMerge(target, source);
			expect(result5).toBe(source);

			source = new Error();
			const result6 = deepMerge(target, source);
			expect(result6).toBe(source);
		});

		it("should clone source when cloneSource option is true", () => {
			const target = { a: 1 };
			const source = { b: { d: 3 } };

			const result = deepMerge(target, source, {
				cloneSource: true,
			});

			expect(result).not.toBe(target);
			expect(result.b).not.toBe(source.b);
		});

		it("should not clone source when cloneSource option is false", () => {
			const target = { a: 1 };
			const source = { b: { d: 3 } };

			const result = deepMerge(target, source, {
				cloneSource: false,
			});

			expect(result).not.toBe(target);
			expect(result.b).toBe(source.b);
		});
	});

	describe("deepMergePojo", () => {
		it("should merge plain objects in place", () => {
			const target = { a: 1, b: { c: 2 } };
			const source = { b: { d: 3 }, e: 4 };

			const result = deepMergePojo(target, source);

			expect(result).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
		});
	});

	describe("deepMergeSet", () => {
		it("should merge sets in place", () => {
			const target = new Set<number | object>([1, 2, { a: 3 }]);
			const source = new Set<number | object>([{ b: 4 }, 5]);

			const result = deepMergeSet(target, source);

			expect(result).toEqual(
				new Set<number | object>([1, 2, { a: 3 }, { b: 4 }, 5]),
			);
		});
	});

	describe("deepMergeMap", () => {
		it("should merge maps in place", () => {
			const target = new Map<string, unknown>([
				["a", 1],
				["b", { c: 2 }],
			]);
			const source = new Map<string, unknown>([
				["b", { d: 3 }],
				["e", 4],
			]);

			const result = deepMergeMap(target, source);

			expect(result).toEqual(
				new Map<string, unknown>([
					["a", 1],
					["b", { c: 2, d: 3 }],
					["e", 4],
				]),
			);
		});
	});

	describe("deepMergeArray", () => {
		it("should merge arrays with 'replace' mode", () => {
			const target = [1, 2, 3];
			const source = [4, 5];
			const result = deepMergeArray(target, source, {
				arrayMergeMode: "replace",
			});
			expect(result).toEqual([4, 5]);
		});

		it("should merge arrays with 'spread' mode", () => {
			const target = [1, 2, 3];
			const source = [4, 5];
			const result = deepMergeArray(target, source, {
				arrayMergeMode: "spread",
			});
			expect(result).toEqual([1, 2, 3, 4, 5]);
		});

		it("should merge arrays with 'merge' mode", () => {
			const target = [1, 2, 3];
			const source = [4, 5];
			const result = deepMergeArray(target, source, {
				arrayMergeMode: "merge",
			});
			expect(result).toEqual([4, 5, 3]);
		});

		it("should merge arrays with 'merge' mode and nested objects", () => {
			const target0 = { a: 1 };
			const target1 = { b: 2 };
			const target2 = { c: 3 };
			const target = [target0, target1, target2];
			const source = [{ a: 4 }, { d: 5 }];
			const result = deepMergeArray(target, source, {
				arrayMergeMode: "merge",
			});
			expect(result).toEqual([{ a: 4 }, { b: 2, d: 5 }, { c: 3 }]);
			expect(result[0]).not.toBe(target0);
			expect(result[1]).not.toBe(target1);
			expect(result[2]).not.toBe(target2);
		});
	});
});
