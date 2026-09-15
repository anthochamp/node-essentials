import { describe, expect, it } from "vitest";

import { chunk } from "./chunk.js";
import { windowed } from "./windowed.js";

describe("windowed", () => {
	it("should yield overlapping windows", () => {
		expect([...windowed([1, 2, 3, 4], 2)]).toEqual([
			[1, 2],
			[2, 3],
			[3, 4],
		]);
	});

	it("should yield windows of the requested width", () => {
		expect([...windowed([1, 2, 3, 4, 5], 3)]).toEqual([
			[1, 2, 3],
			[2, 3, 4],
			[3, 4, 5],
		]);
	});

	it("should advance by step when given one", () => {
		expect([...windowed([1, 2, 3, 4, 5, 6], 2, 3)]).toEqual([
			[1, 2],
			[4, 5],
		]);
	});

	it("should skip elements when step exceeds size", () => {
		expect([...windowed([1, 2, 3, 4, 5, 6, 7], 2, 4)]).toEqual([
			[1, 2],
			[5, 6],
		]);
	});

	it("should agree with chunk when step equals size and the length divides", () => {
		const values = [1, 2, 3, 4, 5, 6];

		expect([...windowed(values, 2, 2)]).toEqual([...chunk(values, 2)]);
	});

	it("should never yield a short trailing window, unlike chunk", () => {
		expect([...windowed([1, 2, 3, 4, 5], 2, 2)]).toEqual([
			[1, 2],
			[3, 4],
		]);
		expect([...chunk([1, 2, 3, 4, 5], 2)]).toEqual([[1, 2], [3, 4], [5]]);
	});

	it("should yield nothing when the input is shorter than the window", () => {
		expect([...windowed([1, 2], 3)]).toEqual([]);
		expect([...windowed([], 1)]).toEqual([]);
	});

	it("should yield each element alone at size 1", () => {
		expect([...windowed([1, 2, 3], 1)]).toEqual([[1], [2], [3]]);
	});

	it("should yield independent arrays", () => {
		const windows = [...windowed([1, 2, 3], 2)];
		windows[0]![0] = 99;

		expect(windows[1]).toEqual([2, 3]);
	});

	it("should be lazy — it stops pulling once a window is full", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		windowed(counted(), 3).next();

		expect(produced).toBe(3);
	});

	it("should reject a non-positive or fractional size or step", () => {
		expect(() => [...windowed([1], 0)]).toThrow(RangeError);
		expect(() => [...windowed([1], -1)]).toThrow(RangeError);
		expect(() => [...windowed([1], 1.5)]).toThrow(RangeError);
		expect(() => [...windowed([1], 1, 0)]).toThrow(RangeError);
		expect(() => [...windowed([1], 1, 1.5)]).toThrow(RangeError);
	});
});
