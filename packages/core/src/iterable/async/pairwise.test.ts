import { describe, expect, it } from "vitest";

import { asyncOf, collect, countedAsync } from "./__fixtures__/async-source.js";
import { cycleAsync } from "./cycle.js";
import { deltasAsync } from "./deltas.js";
import { filterMapAsync } from "./filter-map.js";
import { flattenDeepAsync, type NestedAsyncIterable } from "./flatten-deep.js";
import { flattenAsync } from "./flatten.js";
import { indicesWhereAsync, lastIndicesWhereAsync } from "./indices-where.js";
import { intersperseAsync } from "./intersperse.js";
import { markEndsAsync } from "./mark-ends.js";
import { padAsync } from "./pad.js";
import { pairwiseAsync } from "./pairwise.js";
import { repeatEachAsync } from "./repeat-each.js";
import { takeAsync } from "./take.js";
import { windowedAsync } from "./windowed.js";

describe("pairwiseAsync", () => {
	it("should yield consecutive overlapping pairs", async () => {
		expect(await collect(pairwiseAsync(asyncOf(1, 2, 3)))).toEqual([
			[1, 2],
			[2, 3],
		]);
	});

	it("should accept a sync source", async () => {
		expect(await collect(pairwiseAsync([1, 2]))).toEqual([[1, 2]]);
	});

	it("should yield nothing for fewer than two elements", async () => {
		expect(await collect(pairwiseAsync(asyncOf(1)))).toEqual([]);
	});
});

describe("windowedAsync", () => {
	it("should yield overlapping windows", async () => {
		expect(await collect(windowedAsync(asyncOf(1, 2, 3), 2))).toEqual([
			[1, 2],
			[2, 3],
		]);
	});

	it("should advance by step when given one", async () => {
		expect(
			await collect(windowedAsync(asyncOf(1, 2, 3, 4, 5, 6), 2, 3)),
		).toEqual([
			[1, 2],
			[4, 5],
		]);
	});

	it("should never yield a short trailing window", async () => {
		expect(await collect(windowedAsync(asyncOf(1, 2, 3), 2, 2))).toEqual([
			[1, 2],
		]);
	});

	it("should reject a non-positive size or step", async () => {
		await expect(collect(windowedAsync([1], 0))).rejects.toThrow(RangeError);
		await expect(collect(windowedAsync([1], 1, 0))).rejects.toThrow(RangeError);
	});
});

describe("flattenAsync", () => {
	it("should concatenate inner iterables", async () => {
		expect(await collect(flattenAsync(asyncOf([1, 2], [3])))).toEqual([
			1, 2, 3,
		]);
	});

	it("should mix sync and async levels", async () => {
		expect(await collect(flattenAsync([asyncOf(1, 2), asyncOf(3)]))).toEqual([
			1, 2, 3,
		]);
	});

	it("should flatten one level only", async () => {
		expect(await collect(flattenAsync(asyncOf([[1]], [[2]])))).toEqual([
			[1],
			[2],
		]);
	});
});

describe("flattenDeepAsync", () => {
	it("should flatten to arbitrary depth", async () => {
		expect(
			await collect(
				flattenDeepAsync(
					asyncOf<number | NestedAsyncIterable<number>>(1, [2, [3, [4]]]),
				),
			),
		).toEqual([1, 2, 3, 4]);
	});

	it("should never descend into a string", async () => {
		expect(
			await collect(
				flattenDeepAsync(
					asyncOf<string | NestedAsyncIterable<string>>("ab", ["cd"]),
				),
			),
		).toEqual(["ab", "cd"]);
	});

	it("should descend into a nested async level", async () => {
		expect(
			await collect(
				flattenDeepAsync(
					asyncOf<number | NestedAsyncIterable<number>>(
						1,
						asyncOf<number | NestedAsyncIterable<number>>(2, asyncOf(3)),
					),
				),
			),
		).toEqual([1, 2, 3]);
	});
});

describe("indicesWhereAsync", () => {
	it("should yield the indices of matching elements", async () => {
		expect(
			await collect(
				indicesWhereAsync(asyncOf(1, 2, 3, 4), (value) => value % 2 === 0),
			),
		).toEqual([1, 3]);
	});

	it("should accept an async predicate", async () => {
		expect(
			await collect(
				indicesWhereAsync(asyncOf(1, 2), async (value) => value > 1),
			),
		).toEqual([1]);
	});
});

describe("lastIndicesWhereAsync", () => {
	it("should yield the indices descending", async () => {
		expect(
			await collect(
				lastIndicesWhereAsync(asyncOf(1, 2, 3, 4), (value) => value % 2 === 0),
			),
		).toEqual([3, 1]);
	});

	it("should be the reverse of indicesWhereAsync", async () => {
		const ascending = await collect(
			indicesWhereAsync(asyncOf(1, 2, 3, 4, 5, 6), (value) => value % 2 === 0),
		);
		const descending = await collect(
			lastIndicesWhereAsync(
				asyncOf(1, 2, 3, 4, 5, 6),
				(value) => value % 2 === 0,
			),
		);

		expect(descending).toEqual(ascending.reverse());
	});

	it("should reject an already-aborted signal", async () => {
		await expect(
			collect(
				lastIndicesWhereAsync(asyncOf(1), () => true, AbortSignal.abort()),
			),
		).rejects.toThrow();
	});
});

describe("intersperseAsync", () => {
	it("should place the separator between elements", async () => {
		expect(await collect(intersperseAsync(asyncOf(1, 2, 3), 0))).toEqual([
			1, 0, 2, 0, 3,
		]);
	});

	it("should not add a trailing separator", async () => {
		expect(await collect(intersperseAsync(asyncOf(1), 0))).toEqual([1]);
	});

	it("should yield nothing for an empty source", async () => {
		expect(await collect(intersperseAsync(asyncOf<number>(), 0))).toEqual([]);
	});
});

describe("cycleAsync", () => {
	it("should repeat the sequence the requested number of times", async () => {
		expect(await collect(cycleAsync(asyncOf(1, 2), 3))).toEqual([
			1, 2, 1, 2, 1, 2,
		]);
	});

	it("should repeat forever by default", async () => {
		expect(await collect(takeAsync(cycleAsync(asyncOf(1, 2)), 5))).toEqual([
			1, 2, 1, 2, 1,
		]);
	});

	it("should yield nothing at a count of zero", async () => {
		expect(await collect(cycleAsync(asyncOf(1, 2), 0))).toEqual([]);
	});

	it("should consume a one-shot source only once", async () => {
		const { source, produced } = countedAsync();

		expect(
			await collect(takeAsync(cycleAsync(takeAsync(source(), 2), 3), 6)),
		).toEqual([1, 2, 1, 2, 1, 2]);
		expect(produced()).toBe(2);
	});

	it("should reject a negative or fractional count", async () => {
		await expect(collect(cycleAsync([1], -1))).rejects.toThrow(RangeError);
	});
});

describe("padAsync", () => {
	it("should pad up to the requested length", async () => {
		expect(await collect(padAsync(asyncOf(1, 2), 4, 0))).toEqual([1, 2, 0, 0]);
	});

	it("should never truncate a longer source", async () => {
		expect(await collect(padAsync(asyncOf(1, 2, 3), 2, 0))).toEqual([1, 2, 3]);
	});

	it("should reject a negative length", async () => {
		await expect(collect(padAsync([1], -1, 0))).rejects.toThrow(RangeError);
	});
});

describe("repeatEachAsync", () => {
	it("should repeat each element consecutively", async () => {
		expect(await collect(repeatEachAsync(asyncOf(1, 2), 2))).toEqual([
			1, 1, 2, 2,
		]);
	});

	it("should yield nothing at a count of zero", async () => {
		expect(await collect(repeatEachAsync(asyncOf(1), 0))).toEqual([]);
	});

	it("should reject a negative count", async () => {
		await expect(collect(repeatEachAsync([1], -1))).rejects.toThrow(RangeError);
	});
});

describe("markEndsAsync", () => {
	it("should tag the first and last elements", async () => {
		expect(await collect(markEndsAsync(asyncOf(1, 2, 3)))).toEqual([
			[1, true, false],
			[2, false, false],
			[3, false, true],
		]);
	});

	it("should tag a lone element as both first and last", async () => {
		expect(await collect(markEndsAsync(asyncOf(1)))).toEqual([[1, true, true]]);
	});

	it("should yield nothing for an empty source", async () => {
		expect(await collect(markEndsAsync(asyncOf<number>()))).toEqual([]);
	});
});

describe("deltasAsync", () => {
	it("should yield consecutive differences", async () => {
		expect(
			await collect(
				deltasAsync(
					asyncOf(1, 3, 6),
					(current, previous) => current - previous,
				),
			),
		).toEqual([2, 3]);
	});

	it("should accept an async subtraction", async () => {
		expect(
			await collect(
				deltasAsync(
					asyncOf(1, 3),
					async (current, previous) => current - previous,
				),
			),
		).toEqual([2]);
	});

	it("should yield nothing for fewer than two elements", async () => {
		expect(await collect(deltasAsync(asyncOf(1), (a, b) => a - b))).toEqual([]);
	});
});

describe("filterMapAsync", () => {
	it("should map and drop in one pass", async () => {
		expect(
			await collect(
				filterMapAsync(asyncOf(1, 2, 3, 4), (value) =>
					value % 2 === 0 ? value * 10 : undefined,
				),
			),
		).toEqual([20, 40]);
	});

	it("should accept an async mapper", async () => {
		expect(
			await collect(filterMapAsync(asyncOf(1, 2), async (value) => value * 2)),
		).toEqual([2, 4]);
	});

	it("should keep a null result rather than treating it as declined", async () => {
		expect(
			await collect(
				filterMapAsync(asyncOf(1, 2), (value) =>
					value === 1 ? null : undefined,
				),
			),
		).toEqual([null]);
	});
});
