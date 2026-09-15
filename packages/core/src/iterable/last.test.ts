import { describe, expect, it } from "vitest";

import { last } from "./last.js";

describe("last", () => {
	it("should return the last element of an array", () => {
		expect(last([1, 2, 3])).toBe(3);
	});

	it("should return the last element of a non-array iterable", () => {
		expect(last(new Set(["a", "b"]))).toBe("b");
	});

	it("should return undefined for an empty iterable", () => {
		expect(last([])).toBeUndefined();
		expect(last(new Set<number>())).toBeUndefined();
	});

	it("should return a null element rather than treating it as absent", () => {
		expect(last([1, null])).toBeNull();
	});

	it("should agree between the array and generator paths", () => {
		const values = [1, 2, 3];
		function* generated(): IterableIterator<number> {
			yield* values;
		}

		expect(last(values)).toBe(last(generated()));
	});

	it("should not index an array more than once", () => {
		let reads = 0;
		const probe = new Proxy([1, 2, 3], {
			get(target, key, receiver) {
				if (typeof key === "string" && Number.isInteger(Number(key))) {
					reads++;
				}
				return Reflect.get(target, key, receiver) as unknown;
			},
		});

		expect(last(probe)).toBe(3);
		expect(reads).toBe(1);
	});
});
