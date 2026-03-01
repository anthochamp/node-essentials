import { describe, expect, it } from "vitest";
import { removeSafe } from "./remove-safe.js";

// Helper to create deep equality for objects
function createObj(val: number) {
	return { val };
}

describe("removeSafe", () => {
	it("removes all occurrences of a primitive value", () => {
		const arr = [1, 2, 3, 2, 4, 2, 5];
		const removed = removeSafe(arr, 2);
		expect(removed).toEqual([2, 2, 2]);
		expect(arr).toEqual([1, 3, 4, 5]);
	});

	it("removes all occurrences of an object reference", () => {
		const obj = createObj(1);
		const arr = [obj, { val: 1 }, obj, { val: 2 }, obj];
		const removed = removeSafe(arr, obj);
		expect(removed).toEqual([obj, obj, obj]);
		// Only the objects not strictly equal to obj remain
		expect(arr).toEqual([{ val: 1 }, { val: 2 }]);
	});

	it("returns an empty array if item is not found", () => {
		const arr = [1, 2, 3];
		const removed = removeSafe(arr, 4);
		expect(removed).toEqual([]);
		expect(arr).toEqual([1, 2, 3]);
	});

	it("removes all items if all match", () => {
		const arr = [7, 7, 7];
		const removed = removeSafe(arr, 7);
		expect(removed).toEqual([7, 7, 7]);
		expect(arr).toEqual([]);
	});

	it("does not remove items that are equal but not strictly equal (objects)", () => {
		const arr = [{ a: 1 }, { a: 1 }];
		const removed = removeSafe(arr, { a: 1 });
		expect(removed).toEqual([]);
		expect(arr).toEqual([{ a: 1 }, { a: 1 }]);
	});

	it("handles empty array", () => {
		const arr: number[] = [];
		const removed = removeSafe(arr, 1);
		expect(removed).toEqual([]);
		expect(arr).toEqual([]);
	});

	it("does not re-insert if removed item is undefined", () => {
		const arr = [undefined, 1, undefined];
		const removed = removeSafe(arr, undefined);
		expect(removed).toEqual([undefined, undefined]);
		expect(arr).toEqual([1]);
	});

	it("removes only exact matches (NaN)", () => {
		const arr = [NaN, 1, NaN, 2];
		// NaN !== NaN, so removeSafe will not remove any NaN
		const removed = removeSafe(arr, NaN);
		expect(removed).toEqual([]);
		expect(arr).toEqual([NaN, 1, NaN, 2]);
	});

	// Simulated concurrency test: interleaved mutation
	it("is robust to interleaved mutation (simulated concurrency)", () => {
		const arr = [1, 2, 3, 2, 4, 2, 5];
		let callCount = 0;
		const origSplice = Array.prototype.splice;
		Array.prototype.splice = function (start, deleteCount, ...items) {
			callCount++;
			if (callCount === 2) {
				arr[1] = 99;
			}
			// @ts-expect-error
			return origSplice.apply(this, [start, deleteCount, ...items]);
		};
		try {
			const removed = removeSafe(arr, 2);
			expect(removed).toEqual([2, 2, 2]);
			expect(arr).toEqual([1, 99, 4, 5]);
		} finally {
			Array.prototype.splice = origSplice;
		}
	});

	it("handles insertion before target during removal (simulated concurrency)", () => {
		const arr = [1, 2, 3, 2, 4, 2, 5];
		let callCount = 0;
		const origSplice = Array.prototype.splice;
		Array.prototype.splice = function (start, deleteCount, ...items) {
			callCount++;
			if (callCount === 2) {
				const next2 = arr.indexOf(2);
				if (next2 !== -1) {
					arr.splice(next2, 0, 42);
				}
			}
			// @ts-expect-error
			return origSplice.apply(this, [start, deleteCount, ...items]);
		};
		try {
			const removed = removeSafe(arr, 2);
			expect(removed).toEqual([2, 2, 2]);
			expect(arr).toEqual([1, 3, 42, 4, 5]);
		} finally {
			Array.prototype.splice = origSplice;
		}
	});
});
