import { describe, expect, it } from "vitest";

import {
	asyncOf,
	closableAsync,
	collect,
	countedAsync,
} from "./__fixtures__/async-source.js";
import { alwaysIterableAsync } from "./always-iterable.js";
import { beforeAndAfterAsync } from "./before-and-after.js";
import { consumeAsync } from "./consume.js";
import { isIterableEqualAsync } from "./is-iterable-equal.js";
import { takeAsync } from "./take.js";
import { tapAsync } from "./tap.js";
import { teeAsync } from "./tee.js";
import { trimEndWhileAsync, trimWhileAsync } from "./trim-while.js";
import { unfoldAsync } from "./unfold.js";

describe("isIterableEqualAsync", () => {
	it("should return true for equal sources", async () => {
		expect(await isIterableEqualAsync(asyncOf(1, 2), asyncOf(1, 2))).toBe(true);
	});

	it("should compare an async source against a sync one", async () => {
		expect(await isIterableEqualAsync(asyncOf(1, 2), [1, 2])).toBe(true);
	});

	it("should return false when an element differs", async () => {
		expect(await isIterableEqualAsync(asyncOf(1, 2), asyncOf(1, 9))).toBe(
			false,
		);
	});

	it("should return false when the lengths differ", async () => {
		expect(await isIterableEqualAsync(asyncOf(1), asyncOf(1, 2))).toBe(false);
		expect(await isIterableEqualAsync(asyncOf(1, 2), asyncOf(1))).toBe(false);
	});

	it("should return true for two empty sources", async () => {
		expect(
			await isIterableEqualAsync(asyncOf<number>(), asyncOf<number>()),
		).toBe(true);
	});

	it("should honour a comparison strategy", async () => {
		expect(
			await isIterableEqualAsync(
				asyncOf(Number.NaN),
				asyncOf(Number.NaN),
				"sameValueZero",
			),
		).toBe(true);
	});

	it("should close whichever iterator has not ended", async () => {
		const short = closableAsync(1);
		const long = closableAsync(5);

		expect(await isIterableEqualAsync(short.source(), long.source())).toBe(
			false,
		);
		expect(long.returned()).toBe(true);
	});

	it("should reject an already-aborted signal", async () => {
		await expect(
			isIterableEqualAsync(
				asyncOf(1),
				asyncOf(1),
				"strict",
				AbortSignal.abort(),
			),
		).rejects.toThrow();
	});
});

describe("tapAsync", () => {
	it("should yield the elements unchanged", async () => {
		expect(await collect(tapAsync(asyncOf(1, 2), () => {}))).toEqual([1, 2]);
	});

	it("should run the side effect once per element", async () => {
		const seen: number[] = [];
		await collect(
			tapAsync(asyncOf(1, 2, 3), (value) => {
				seen.push(value);
			}),
		);

		expect(seen).toEqual([1, 2, 3]);
	});

	it("should await an async side effect before yielding", async () => {
		const order: string[] = [];
		await collect(
			tapAsync(asyncOf(1), async (value) => {
				await Promise.resolve();
				order.push(`effect:${value}`);
			}),
		);

		expect(order).toEqual(["effect:1"]);
	});
});

describe("unfoldAsync", () => {
	it("should generate until the step function stops", async () => {
		expect(
			await collect(
				unfoldAsync(1, (value) =>
					value <= 3 ? [value, value + 1] : undefined,
				),
			),
		).toEqual([1, 2, 3]);
	});

	it("should accept an async step function", async () => {
		expect(
			await collect(
				unfoldAsync(1, async (value) =>
					value <= 2 ? [value, value + 1] : undefined,
				),
			),
		).toEqual([1, 2]);
	});

	it("should yield nothing when the first step declines", async () => {
		expect(await collect(unfoldAsync(0, () => undefined))).toEqual([]);
	});

	it("should generate forever when the step never declines", async () => {
		expect(
			await collect(
				takeAsync(
					unfoldAsync(1, (value) => [value, value * 2]),
					4,
				),
			),
		).toEqual([1, 2, 4, 8]);
	});
});

describe("trimEndWhileAsync", () => {
	it("should remove a trailing run", async () => {
		expect(
			await collect(trimEndWhileAsync(asyncOf(1, 2, 0, 0), (v) => v === 0)),
		).toEqual([1, 2]);
	});

	it("should keep matches that are not trailing", async () => {
		expect(
			await collect(trimEndWhileAsync(asyncOf(0, 1, 0, 2), (v) => v === 0)),
		).toEqual([0, 1, 0, 2]);
	});
});

describe("trimWhileAsync", () => {
	it("should remove both leading and trailing runs", async () => {
		expect(
			await collect(trimWhileAsync(asyncOf(0, 0, 1, 2, 0), (v) => v === 0)),
		).toEqual([1, 2]);
	});

	it("should keep matches in the middle", async () => {
		expect(
			await collect(trimWhileAsync(asyncOf(0, 1, 0, 2, 0), (v) => v === 0)),
		).toEqual([1, 0, 2]);
	});

	it("should accept an async predicate", async () => {
		expect(
			await collect(trimWhileAsync(asyncOf(0, 1, 0), async (v) => v === 0)),
		).toEqual([1]);
	});
});

describe("beforeAndAfterAsync", () => {
	it("should split at the first element failing the predicate", async () => {
		const [before, after] = beforeAndAfterAsync(
			asyncOf(1, 2, 3, 4),
			(value) => value < 3,
		);

		expect(await collect(before)).toEqual([1, 2]);
		expect(await collect(after)).toEqual([3, 4]);
	});

	it("should lose nothing — the halves rejoin into the source", async () => {
		const [before, after] = beforeAndAfterAsync(
			asyncOf(1, 2, 3, 4, 5),
			(value) => value < 3,
		);

		expect([...(await collect(before)), ...(await collect(after))]).toEqual([
			1, 2, 3, 4, 5,
		]);
	});

	it("should drain the first half when the second is read early", async () => {
		const [, after] = beforeAndAfterAsync(
			asyncOf(1, 2, 3, 4),
			(value) => value < 3,
		);

		expect(await collect(after)).toEqual([3, 4]);
	});

	it("should leave the second half empty when the predicate always holds", async () => {
		const [before, after] = beforeAndAfterAsync(asyncOf(1, 2), () => true);

		expect(await collect(before)).toEqual([1, 2]);
		expect(await collect(after)).toEqual([]);
	});
});

describe("teeAsync", () => {
	it("should give every branch the same elements", async () => {
		const [a, b] = teeAsync(asyncOf(1, 2, 3));

		expect(await collect(a!)).toEqual([1, 2, 3]);
		expect(await collect(b!)).toEqual([1, 2, 3]);
	});

	it("should pull the source only once", async () => {
		const { source, produced } = countedAsync();
		const [a, b] = teeAsync(takeAsync(source(), 3));

		expect(await collect(a!)).toEqual([1, 2, 3]);
		expect(await collect(b!)).toEqual([1, 2, 3]);
		expect(produced()).toBe(3);
	});

	it("should share one read between branches advancing concurrently", async () => {
		const { source, produced } = countedAsync();
		const [a, b] = teeAsync(source());
		const [fromA, fromB] = await Promise.all([a!.next(), b!.next()]);

		expect(fromA.value).toBe(1);
		expect(fromB.value).toBe(1);
		expect(produced()).toBe(1);
	});

	it("should produce as many branches as requested", async () => {
		const branches = teeAsync(asyncOf(1, 2), 3);

		expect(branches).toHaveLength(3);
		expect(
			await Promise.all(branches.map((branch) => collect(branch))),
		).toEqual([
			[1, 2],
			[1, 2],
			[1, 2],
		]);
	});

	it("should return no branches at a count of zero", () => {
		expect(teeAsync(asyncOf(1), 0)).toEqual([]);
	});

	it("should reject a negative or fractional count", () => {
		expect(() => teeAsync(asyncOf(1), -1)).toThrow(RangeError);
		expect(() => teeAsync(asyncOf(1), 1.5)).toThrow(RangeError);
	});
});

describe("alwaysIterableAsync", () => {
	it("should wrap a single item", async () => {
		expect(await collect(alwaysIterableAsync(1))).toEqual([1]);
	});

	it("should treat a string as one item", async () => {
		expect(await collect(alwaysIterableAsync("abc"))).toEqual(["abc"]);
	});

	it("should pass a sync iterable through", async () => {
		expect(await collect(alwaysIterableAsync([1, 2]))).toEqual([1, 2]);
	});

	it("should pass an async iterable through", async () => {
		expect(await collect(alwaysIterableAsync(asyncOf(1, 2)))).toEqual([1, 2]);
	});

	it("should wrap null and undefined rather than dropping them", async () => {
		expect(await collect(alwaysIterableAsync(null))).toEqual([null]);
		expect(await collect(alwaysIterableAsync(undefined))).toEqual([undefined]);
	});
});

describe("consumeAsync", () => {
	it("should drain the whole source by default", async () => {
		const seen: number[] = [];
		await consumeAsync(
			tapAsync(asyncOf(1, 2, 3), (value) => {
				seen.push(value);
			}),
		);

		expect(seen).toEqual([1, 2, 3]);
	});

	it("should drain only the requested count", async () => {
		const seen: number[] = [];
		await consumeAsync(
			tapAsync(asyncOf(1, 2, 3, 4), (value) => {
				seen.push(value);
			}),
			2,
		);

		expect(seen).toEqual([1, 2]);
	});

	it("should terminate on an endless source when given a count", async () => {
		const { source, produced } = countedAsync();
		await consumeAsync(source(), 3);

		expect(produced()).toBe(3);
	});

	it("should close the iterator when a count cuts the drain short", async () => {
		const { source, returned } = closableAsync(10);
		await consumeAsync(source(), 2);

		expect(returned()).toBe(true);
	});

	it("should reject a negative or fractional count", async () => {
		await expect(consumeAsync(asyncOf(1), -1)).rejects.toThrow(RangeError);
		await expect(consumeAsync(asyncOf(1), 1.5)).rejects.toThrow(RangeError);
	});
});
