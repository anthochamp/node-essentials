import { describe, expect, it } from "vitest";

import { asyncOf, collect, countedAsync } from "./__fixtures__/async-source.js";
import { chunkAsync } from "./chunk.js";
import { compactAsync } from "./compact.js";
import { concatAsync } from "./concat.js";

describe("chunkAsync", () => {
	it("should split an async source into groups", async () => {
		expect(await collect(chunkAsync(asyncOf(1, 2, 3, 4), 2))).toEqual([
			[1, 2],
			[3, 4],
		]);
	});

	it("should accept a sync source", async () => {
		expect(await collect(chunkAsync([1, 2, 3], 2))).toEqual([[1, 2], [3]]);
	});

	it("should yield nothing for an empty source", async () => {
		expect(await collect(chunkAsync(asyncOf<number>(), 3))).toEqual([]);
	});

	it("should be lazy", async () => {
		const { source, produced } = countedAsync();
		await chunkAsync(source(), 2).next();

		expect(produced()).toBe(2);
	});

	it("should reject a non-positive or fractional size", async () => {
		await expect(collect(chunkAsync([1], 0))).rejects.toThrow(RangeError);
		await expect(collect(chunkAsync([1], 1.5))).rejects.toThrow(RangeError);
	});
});

describe("compactAsync", () => {
	it("should drop null and undefined", async () => {
		expect(await collect(compactAsync(asyncOf(1, null, 2, undefined)))).toEqual(
			[1, 2],
		);
	});

	it("should accept a sync source", async () => {
		expect(await collect(compactAsync([1, null, 2]))).toEqual([1, 2]);
	});

	it("should keep falsy values that are not nullish", async () => {
		expect(
			await collect(
				compactAsync(
					asyncOf<number | string | boolean | null>(0, "", false, null),
				),
			),
		).toEqual([0, "", false]);
	});

	it("should yield nothing for an empty source", async () => {
		expect(await collect(compactAsync(asyncOf<number>()))).toEqual([]);
	});
});

describe("concatAsync", () => {
	it("should chain async sources in order", async () => {
		expect(await collect(concatAsync(asyncOf(1, 2), asyncOf(3)))).toEqual([
			1, 2, 3,
		]);
	});

	it("should mix sync and async sources", async () => {
		expect(await collect(concatAsync([1, 2], asyncOf(3, 4)))).toEqual([
			1, 2, 3, 4,
		]);
	});

	it("should yield nothing when given no sources", async () => {
		expect(await collect(concatAsync<number>())).toEqual([]);
	});

	it("should skip empty sources", async () => {
		expect(await collect(concatAsync([], asyncOf(1), []))).toEqual([1]);
	});
});
