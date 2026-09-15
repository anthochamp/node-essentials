import { describe, expect, it } from "vitest";

import { dropWhile } from "./drop-while.js";
import { trimEndWhile, trimWhile } from "./trim-while.js";

const isZero = (value: number): boolean => value === 0;

describe("trimEndWhile", () => {
	it("should remove a trailing run", () => {
		expect([...trimEndWhile([1, 2, 0, 0], isZero)]).toEqual([1, 2]);
	});

	it("should keep matches that are not trailing", () => {
		expect([...trimEndWhile([0, 1, 0, 2], isZero)]).toEqual([0, 1, 0, 2]);
	});

	it("should leave a leading run alone", () => {
		expect([...trimEndWhile([0, 0, 1], isZero)]).toEqual([0, 0, 1]);
	});

	it("should yield nothing when everything matches", () => {
		expect([...trimEndWhile([0, 0], isZero)]).toEqual([]);
	});

	it("should yield nothing for an empty iterable", () => {
		expect([...trimEndWhile([], isZero)]).toEqual([]);
	});

	it("should behave like String.prototype.trimEnd over characters", () => {
		const text = "  hi  ";
		const trimmed = [...trimEndWhile(text, (char) => char === " ")].join("");

		expect(trimmed).toBe(text.trimEnd());
	});
});

describe("trimWhile", () => {
	it("should remove both leading and trailing runs", () => {
		expect([...trimWhile([0, 0, 1, 2, 0], isZero)]).toEqual([1, 2]);
	});

	it("should keep matches in the middle", () => {
		expect([...trimWhile([0, 1, 0, 2, 0], isZero)]).toEqual([1, 0, 2]);
	});

	it("should yield nothing when everything matches", () => {
		expect([...trimWhile([0, 0, 0], isZero)]).toEqual([]);
	});

	it("should yield nothing for an empty iterable", () => {
		expect([...trimWhile([], isZero)]).toEqual([]);
	});

	it("should leave an untrimmable sequence unchanged", () => {
		expect([...trimWhile([1, 2, 3], isZero)]).toEqual([1, 2, 3]);
	});

	it("should behave like String.prototype.trim over characters", () => {
		const text = "  hi  ";
		const trimmed = [...trimWhile(text, (char) => char === " ")].join("");

		expect(trimmed).toBe(text.trim());
	});

	it("should agree with dropWhile for the start-only case", () => {
		const values = [0, 0, 1, 2];

		expect([...trimWhile(values, isZero)]).toEqual([
			...dropWhile(values, (value) => isZero(value)),
		]);
	});
});
