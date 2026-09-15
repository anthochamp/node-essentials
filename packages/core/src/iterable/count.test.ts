import { describe, expect, it } from "vitest";

import { count } from "./count.js";

describe("count", () => {
	it("should count the elements of an array", () => {
		expect(count([1, 2, 3])).toBe(3);
	});

	it("should count the elements of a Set", () => {
		expect(count(new Set([1, 2, 2, 3]))).toBe(3);
	});

	it("should count the entries of a Map", () => {
		expect(count(new Map([["a", 1]]))).toBe(1);
	});

	it("should count the elements of a generator", () => {
		function* generated(): IterableIterator<number> {
			yield 1;
			yield 2;
		}

		expect(count(generated())).toBe(2);
	});

	it("should return zero for an empty iterable", () => {
		expect(count([])).toBe(0);
		expect(count(new Set())).toBe(0);
	});

	it("should count characters of a string", () => {
		expect(count("abc")).toBe(3);
	});

	it("should agree with the materialised length", () => {
		function* generated(): IterableIterator<number> {
			yield* [1, 2, 3, 4];
		}

		expect(count(generated())).toBe([...generated()].length);
	});

	it("should drain the iterable it counts", () => {
		function* generated(): IterableIterator<number> {
			yield 1;
			yield 2;
		}

		const iterator = generated();

		expect(count(iterator)).toBe(2);
		expect(iterator.next().done).toBe(true);
	});
});
