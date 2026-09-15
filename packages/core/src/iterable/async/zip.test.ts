import { describe, expect, it } from "vitest";

import {
	asyncOf,
	closableAsync,
	collect,
	countedAsync,
} from "./__fixtures__/async-source.js";
import { unzipAsync } from "./unzip.js";
import { zipLongestAsync } from "./zip-longest.js";
import { zipAsync } from "./zip.js";

describe("zipAsync", () => {
	it("should pair elements positionally", async () => {
		expect(await collect(zipAsync([asyncOf(1, 2), asyncOf("a", "b")]))).toEqual(
			[
				[1, "a"],
				[2, "b"],
			],
		);
	});

	it("should mix sync and async sources", async () => {
		expect(await collect(zipAsync([[1, 2, 3], asyncOf("a", "b")]))).toEqual([
			[1, "a"],
			[2, "b"],
		]);
	});

	it("should stop at the shortest source", async () => {
		expect(await collect(zipAsync([asyncOf(1, 2, 3), asyncOf(10)]))).toEqual([
			[1, 10],
		]);
	});

	it("should yield nothing when given no sources", async () => {
		expect(await collect(zipAsync([]))).toEqual([]);
	});

	it("should yield nothing when any source is empty", async () => {
		expect(await collect(zipAsync([asyncOf(1), asyncOf<number>()]))).toEqual(
			[],
		);
	});

	it("should not pull beyond the tuples requested", async () => {
		const a = countedAsync();
		const b = countedAsync();
		await zipAsync([a.source(), b.source()]).next();

		expect(a.produced()).toBe(1);
		expect(b.produced()).toBe(1);
	});

	it("should close every source when the shortest ends", async () => {
		const short = closableAsync(1);
		const long = closableAsync(5);

		expect(await collect(zipAsync([short.source(), long.source()]))).toEqual([
			[0, 0],
		]);
		expect(short.returned()).toBe(true);
		expect(long.returned()).toBe(true);
	});
});

describe("zipLongestAsync", () => {
	it("should continue to the longest source, filling the rest", async () => {
		expect(
			await collect(zipLongestAsync([asyncOf(1, 2, 3), asyncOf(10)], null)),
		).toEqual([
			[1, 10],
			[2, null],
			[3, null],
		]);
	});

	it("should mix sync and async sources", async () => {
		expect(await collect(zipLongestAsync([[1], asyncOf(10, 20)], 0))).toEqual([
			[1, 10],
			[0, 20],
		]);
	});

	it("should yield nothing when given no sources", async () => {
		expect(await collect(zipLongestAsync([], null))).toEqual([]);
	});

	it("should yield nothing when every source is empty", async () => {
		expect(
			await collect(zipLongestAsync([asyncOf<number>(), []], null)),
		).toEqual([]);
	});
});

describe("unzipAsync", () => {
	it("should split tuples into columns", async () => {
		expect(
			await unzipAsync(asyncOf<[number, string]>([1, "a"], [2, "b"])),
		).toEqual([
			[1, 2],
			["a", "b"],
		]);
	});

	it("should accept a sync source", async () => {
		expect(
			await unzipAsync([
				[1, "a"],
				[2, "b"],
			] as [number, string][]),
		).toEqual([
			[1, 2],
			["a", "b"],
		]);
	});

	it("should round-trip with zipAsync", async () => {
		const tuples = await collect(
			zipAsync([
				[1, 2],
				["a", "b"],
			]),
		);

		expect(await unzipAsync(tuples)).toEqual([
			[1, 2],
			["a", "b"],
		]);
	});

	it("should return no columns for an empty source", async () => {
		expect(await unzipAsync(asyncOf<[number]>())).toEqual([]);
	});

	it("should reject an already-aborted signal", async () => {
		await expect(
			unzipAsync(asyncOf<[number]>([1]), AbortSignal.abort()),
		).rejects.toThrow();
	});
});
