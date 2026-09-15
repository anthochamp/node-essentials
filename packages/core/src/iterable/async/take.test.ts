import { describe, expect, it } from "vitest";

import {
	asyncOf,
	closableAsync,
	collect,
	countedAsync,
} from "./__fixtures__/async-source.js";
import { dropWhileAsync } from "./drop-while.js";
import { dropAsync } from "./drop.js";
import { takeWhileInclusiveAsync } from "./take-while-inclusive.js";
import { takeWhileAsync } from "./take-while.js";
import { takeAsync } from "./take.js";

describe("takeAsync", () => {
	it("should yield the leading elements", async () => {
		expect(await collect(takeAsync(asyncOf(1, 2, 3, 4), 2))).toEqual([1, 2]);
	});

	it("should accept a sync source", async () => {
		expect(await collect(takeAsync([1, 2, 3], 2))).toEqual([1, 2]);
	});

	it("should yield everything when the count exceeds the length", async () => {
		expect(await collect(takeAsync(asyncOf(1, 2), 5))).toEqual([1, 2]);
	});

	it("should consume nothing at a count of zero", async () => {
		const { source, produced } = countedAsync();

		expect(await collect(takeAsync(source(), 0))).toEqual([]);
		expect(produced()).toBe(0);
	});

	it("should terminate on an endless source", async () => {
		const { source } = countedAsync();

		expect(await collect(takeAsync(source(), 3))).toEqual([1, 2, 3]);
	});

	it("should close the source once the quota is met", async () => {
		const { source, returned } = closableAsync(10);

		expect(await collect(takeAsync(source(), 2))).toEqual([0, 1]);
		expect(returned()).toBe(true);
	});

	it("should reject a negative or fractional count", async () => {
		await expect(collect(takeAsync([1], -1))).rejects.toThrow(RangeError);
		await expect(collect(takeAsync([1], 1.5))).rejects.toThrow(RangeError);
	});
});

describe("dropAsync", () => {
	it("should skip the leading elements", async () => {
		expect(await collect(dropAsync(asyncOf(1, 2, 3, 4), 2))).toEqual([3, 4]);
	});

	it("should accept a sync source", async () => {
		expect(await collect(dropAsync([1, 2, 3], 1))).toEqual([2, 3]);
	});

	it("should yield nothing when the count exceeds the length", async () => {
		expect(await collect(dropAsync(asyncOf(1, 2), 5))).toEqual([]);
	});

	it("should yield everything at a count of zero", async () => {
		expect(await collect(dropAsync(asyncOf(1, 2), 0))).toEqual([1, 2]);
	});

	it("should reject a negative or fractional count", async () => {
		await expect(collect(dropAsync([1], -1))).rejects.toThrow(RangeError);
		await expect(collect(dropAsync([1], 1.5))).rejects.toThrow(RangeError);
	});
});

describe("takeWhileAsync", () => {
	it("should yield the leading elements that satisfy the predicate", async () => {
		expect(
			await collect(takeWhileAsync(asyncOf(1, 2, 3, 1), (value) => value < 3)),
		).toEqual([1, 2]);
	});

	it("should accept an async predicate", async () => {
		expect(
			await collect(
				takeWhileAsync(asyncOf(1, 2, 9), async (value) => value < 5),
			),
		).toEqual([1, 2]);
	});

	it("should not resume after the first rejection", async () => {
		expect(
			await collect(takeWhileAsync(asyncOf(1, 9, 2), (value) => value < 5)),
		).toEqual([1]);
	});

	it("should terminate on an endless source", async () => {
		const { source } = countedAsync();

		expect(
			await collect(takeWhileAsync(source(), (value) => value < 4)),
		).toEqual([1, 2, 3]);
	});

	it("should pass the zero-based index to the predicate", async () => {
		expect(
			await collect(
				takeWhileAsync(asyncOf("a", "b", "c"), (_value, index) => index < 1),
			),
		).toEqual(["a"]);
	});
});

describe("dropWhileAsync", () => {
	it("should skip the leading elements that satisfy the predicate", async () => {
		expect(
			await collect(dropWhileAsync(asyncOf(1, 2, 3, 1), (value) => value < 3)),
		).toEqual([3, 1]);
	});

	it("should accept an async predicate", async () => {
		expect(
			await collect(
				dropWhileAsync(asyncOf(1, 2, 9), async (value) => value < 5),
			),
		).toEqual([9]);
	});

	it("should yield everything when the first element is rejected", async () => {
		expect(
			await collect(dropWhileAsync(asyncOf(3, 1), (value) => value < 3)),
		).toEqual([3, 1]);
	});

	it("should stop consulting the predicate after the first rejection", async () => {
		let calls = 0;
		const kept = await collect(
			dropWhileAsync(asyncOf(1, 9, 2, 3), (value) => {
				calls++;
				return value < 5;
			}),
		);

		expect(calls).toBe(2);
		expect(kept).toEqual([9, 2, 3]);
	});
});

describe("takeWhileInclusiveAsync", () => {
	it("should keep the element that fails the predicate", async () => {
		expect(
			await collect(
				takeWhileInclusiveAsync(asyncOf(1, 2, 3, 4), (value) => value < 3),
			),
		).toEqual([1, 2, 3]);
	});

	it("should yield exactly one more element than takeWhileAsync", async () => {
		const inclusive = await collect(
			takeWhileInclusiveAsync(asyncOf(1, 2, 3, 4), (value) => value < 3),
		);
		const exclusive = await collect(
			takeWhileAsync(asyncOf(1, 2, 3, 4), (value) => value < 3),
		);

		expect(inclusive).toHaveLength(exclusive.length + 1);
	});

	it("should yield everything when the predicate always holds", async () => {
		expect(
			await collect(takeWhileInclusiveAsync(asyncOf(1, 2), () => true)),
		).toEqual([1, 2]);
	});

	it("should terminate on an endless source", async () => {
		const { source } = countedAsync();

		expect(
			await collect(takeWhileInclusiveAsync(source(), (value) => value < 3)),
		).toEqual([1, 2, 3]);
	});
});
