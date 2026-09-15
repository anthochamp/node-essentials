import { expect, suite, test } from "vitest";

import { TypedVector } from "./typed-vector.js";

suite("TypedVector", () => {
	test("should start empty with a minimum backing", () => {
		const vector = new TypedVector(Float64Array);

		expect(vector.count()).toBe(0);
		expect(vector.physicalLength).toBeGreaterThanOrEqual(8);
		expect(Array.from(vector)).toEqual([]);
	});

	test("should accept an initial iterable", () => {
		const vector = new TypedVector(Int32Array, [1, 2, 3]);

		expect(vector.count()).toBe(3);
		expect(Array.from(vector)).toEqual([1, 2, 3]);
	});

	test("should reject a negative or fractional initial capacity", () => {
		expect(
			() => new TypedVector(Int32Array, undefined, { initialCapacity: -1 }),
		).toThrow(RangeError);
		expect(
			() => new TypedVector(Int32Array, undefined, { initialCapacity: 1.5 }),
		).toThrow(RangeError);
	});

	test("should pre-allocate the requested capacity", () => {
		const vector = new TypedVector(Int32Array, undefined, {
			initialCapacity: 100,
		});

		expect(vector.physicalLength).toBe(100);
		expect(vector.count()).toBe(0);
	});

	test("should push and pop at the back", () => {
		const vector = new TypedVector(Int32Array);

		vector.pushBack(1);
		vector.pushBack(2);

		expect(vector.back()).toBe(2);
		expect(vector.popBack()).toBe(2);
		expect(vector.popBack()).toBe(1);
		expect(vector.popBack()).toBeUndefined();
		expect(vector.back()).toBeUndefined();
		expect(vector.count()).toBe(0);
	});

	test("should push a batch in one bulk copy", () => {
		const vector = new TypedVector(Int32Array, [1]);

		vector.pushBackAll([2, 3, 4]);

		expect(Array.from(vector)).toEqual([1, 2, 3, 4]);
	});

	test("should ignore an empty batch", () => {
		const vector = new TypedVector(Int32Array, [1]);

		vector.pushBackAll([]);

		expect(vector.count()).toBe(1);
	});

	test("should grow geometrically past its backing", () => {
		const vector = new TypedVector(Int32Array, undefined, {
			initialCapacity: 8,
		});

		for (let value = 0; value < 1000; value++) {
			vector.pushBack(value);
		}

		expect(vector.count()).toBe(1000);
		expect(vector.physicalLength).toBeGreaterThanOrEqual(1000);
		expect(vector.get(999)).toBe(999);
		expect(vector.get(0)).toBe(0);
	});

	test("should grow once for a batch larger than the doubling would give", () => {
		const vector = new TypedVector(Int32Array, undefined, {
			initialCapacity: 8,
		});

		vector.pushBackAll(Array.from({ length: 500 }, (_, index) => index));

		expect(vector.count()).toBe(500);
		expect(vector.get(499)).toBe(499);
	});

	test("should read and write by index", () => {
		const vector = new TypedVector(Int32Array, [1, 2, 3]);

		vector.set(1, 99);

		expect(vector.get(1)).toBe(99);
		expect(vector.get(-1)).toBeUndefined();
		expect(vector.get(3)).toBeUndefined();
		expect(() => vector.set(3, 0)).toThrow(RangeError);
		expect(() => vector.set(-1, 0)).toThrow(RangeError);
	});

	test("should clear without releasing the backing", () => {
		const vector = new TypedVector(Int32Array, [1, 2, 3]);
		const physical = vector.physicalLength;

		vector.clear();

		expect(vector.count()).toBe(0);
		expect(vector.physicalLength).toBe(physical);
		expect(Array.from(vector)).toEqual([]);
	});

	suite("element type", () => {
		test("should truncate to the array's integer width", () => {
			const vector = new TypedVector(Int8Array);

			vector.pushBack(300);

			// 300 wraps to 44 in a signed byte: the typed array's semantics, surfaced
			// rather than hidden.
			expect(vector.get(0)).toBe(44);
		});

		test("should keep full precision in a Float64Array", () => {
			const vector = new TypedVector(Float64Array);

			vector.pushBack(0.1);

			expect(vector.get(0)).toBe(0.1);
		});

		test("should hand back a copy of its own array type", () => {
			const vector = new TypedVector(Float64Array, [1, 2, 3]);

			const copy = vector.toTypedArray();

			expect(copy).toBeInstanceOf(Float64Array);
			expect(Array.from(copy)).toEqual([1, 2, 3]);

			// A copy, not a view: mutating it must not reach the vector.
			copy[0] = 99;
			expect(vector.get(0)).toBe(1);
		});

		test("should not expose slots beyond the count", () => {
			const vector = new TypedVector(Int32Array, undefined, {
				initialCapacity: 64,
			});

			vector.pushBack(1);

			expect(vector.toTypedArray()).toHaveLength(1);
			expect(Array.from(vector)).toEqual([1]);
		});
	});
});
