import { expect, suite, test } from "vitest";

import { mergeAllInplace, mergeInplace } from "./merge-inplace.js";

suite("mergeAllInplace", () => {
	test("should fold every source into the target", () => {
		const target: Record<string, unknown> = { a: 1 };

		const result = mergeAllInplace(target, [{ b: 2 }, { a: 3 }]);

		expect(result).toBe(target);
		expect(target).toEqual({ a: 3, b: 2 });
	});

	test("should leave the target alone for no sources", () => {
		const target = { a: 1 };

		expect(mergeAllInplace(target, [])).toBe(target);
		expect(target).toEqual({ a: 1 });
	});

	test("should apply the options across the whole fold", () => {
		const target: Record<string, unknown> = { a: [1] };

		mergeAllInplace(target, [{ a: [2] }, { a: [3] }], {
			recursive: true,
			arrayMergeMode: "spread",
		});

		expect(target).toEqual({ a: [1, 2, 3] });
	});

	test("should merge nested values across sources when recursive", () => {
		const target: Record<string, unknown> = { a: { b: 1 } };

		mergeAllInplace(target, [{ a: { c: 2 } }, { a: { d: 3 } }], {
			recursive: true,
		});

		expect(target).toEqual({ a: { b: 1, c: 2, d: 3 } });
	});
});

suite("mergeInplace", () => {
	suite("shallow (default)", () => {
		test("should take the source value whole for a key present in both", () => {
			const target = { a: 1, b: { c: 2 } };
			const source = { b: { d: 3 }, e: 4 };

			const result = mergeInplace(target, source);

			expect(result).toBe(target);
			expect(target).toEqual({ a: 1, b: { d: 3 }, e: 4 });
		});

		test("should not recurse into map values", () => {
			const target = new Map<string, unknown>([["b", { c: 2 }]]);
			const source = new Map<string, unknown>([["b", { d: 3 }]]);

			mergeInplace(target, source);

			expect(target).toEqual(new Map<string, unknown>([["b", { d: 3 }]]));
		});
	});

	suite("recursive", () => {
		test("should merge plain objects into the target", () => {
			const target = { a: 1, b: { c: 2 } };
			const source = { b: { d: 3 }, e: 4 };

			const result = mergeInplace(target, source, { recursive: true });

			expect(result).toBe(target);
			expect(target).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
		});

		test("should merge maps into the target", () => {
			const target = new Map<string, unknown>([
				["a", 1],
				["b", { c: 2 }],
			]);
			const source = new Map<string, unknown>([
				["b", { d: 3 }],
				["e", 4],
			]);

			const result = mergeInplace(target, source, { recursive: true });

			expect(result).toBe(target);
			expect(target).toEqual(
				new Map<string, unknown>([
					["a", 1],
					["b", { c: 2, d: 3 }],
					["e", 4],
				]),
			);
		});

		test("should union sets into the target", () => {
			const target = new Set<number | object>([1, 2, { a: 3 }]);
			const source = new Set<number | object>([{ b: 4 }, 5]);

			const result = mergeInplace(target, source, { recursive: true });

			expect(result).toBe(target);
			expect(target).toEqual(
				new Set<number | object>([1, 2, { a: 3 }, { b: 4 }, 5]),
			);
		});
	});

	suite("arrayMergeMode", () => {
		test("should replace the target's contents by default", () => {
			const target = [1, 2, 3];

			const result = mergeInplace(target, [4, 5]);

			expect(result).toBe(target);
			expect(target).toEqual([4, 5]);
		});

		test("should append under 'spread'", () => {
			const target = [1, 2, 3];

			mergeInplace(target, [4, 5], { arrayMergeMode: "spread" });

			expect(target).toEqual([1, 2, 3, 4, 5]);
		});

		test("should overlay element-wise under 'merge'", () => {
			const target = [1, 2, 3];

			mergeInplace(target, [4, 5], { arrayMergeMode: "merge" });

			expect(target).toEqual([4, 5, 3]);
		});

		test("should merge nested elements under 'merge' when recursive", () => {
			const target = [{ a: 1 }, { b: 2 }, { c: 3 }];

			mergeInplace(target, [{ a: 4 }, { d: 5 }], {
				recursive: true,
				arrayMergeMode: "merge",
			});

			expect(target).toEqual([{ a: 4 }, { b: 2, d: 5 }, { c: 3 }]);
		});
	});

	suite("non-mergeable pairs", () => {
		test("should return source when the target cannot be merged into", () => {
			const source = { a: 1 };

			expect(mergeInplace(1, source)).toBe(source);
		});

		test("should return source when target and source are different kinds", () => {
			const source = [1, 2, 3];

			expect(mergeInplace({ a: 1 }, source)).toBe(source);
		});
	});

	suite("cloneSource", () => {
		test("should copy source values when true", () => {
			const target: Record<string, unknown> = { a: 1 };
			const source = { b: { d: 3 } };

			mergeInplace(target, source, { cloneSource: true });

			expect(target.b).not.toBe(source.b);
			expect(target.b).toEqual(source.b);
		});

		test("should share source values when false", () => {
			const target: Record<string, unknown> = { a: 1 };
			const source = { b: { d: 3 } };

			mergeInplace(target, source, { cloneSource: false });

			expect(target.b).toBe(source.b);
		});
	});
});
