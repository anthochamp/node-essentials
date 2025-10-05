import { expect, suite, test } from "vitest";
import { uniq } from "./uniq.js";

suite("uniq", () => {
	test("should remove duplicates using sameValueZero strategy by default", () => {
		const array = [1, 2, 2, 3, NaN, NaN, 0, -0];
		const result = uniq(array);
		expect(result).toEqual([1, 2, 3, NaN, 0]);
	});

	test("should remove duplicates using strict strategy", () => {
		const array = [1, 2, 2, 3, NaN, NaN, 0, -0];
		const result = uniq(array, "strict");
		expect(result).toEqual([1, 2, 3, NaN, NaN, 0]);
	});

	test("should remove duplicates using loose strategy", () => {
		const array = [1, "1", 2, "2", 2, 3, NaN, NaN, 0, -0];
		const result = uniq(array, "loose");
		expect(result).toEqual([1, 2, 3, NaN, NaN, 0]);
	});

	test("should remove duplicates using sameValue strategy", () => {
		const array = [1, 2, 2, 3, NaN, NaN, 0, -0];
		const result = uniq(array, "sameValue");
		expect(result).toEqual([1, 2, 3, NaN, 0, -0]);
	});

	test("should remove duplicates using a custom predicate", () => {
		const array = [{ id: 1 }, { id: 2 }, { id: 1 }];
		const predicate = (a: { id: number }, b: { id: number }) => a.id === b.id;
		const result = uniq(array, predicate);
		expect(result).toEqual([{ id: 1 }, { id: 2 }]);
	});
});
