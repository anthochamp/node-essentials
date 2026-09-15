import { describe, expect, it } from "vitest";

import {
	asyncOf,
	closableAsync,
	countedAsync,
} from "./__fixtures__/async-source.js";
import { countAsync } from "./count.js";
import { firstAsync } from "./first.js";
import { includesAsync } from "./includes.js";
import { lastAsync } from "./last.js";
import { nthAsync } from "./nth.js";
import { oneAsync } from "./one.js";
import { onlyAsync } from "./only.js";

describe("firstAsync", () => {
	it("should return the first element", async () => {
		expect(await firstAsync(asyncOf(1, 2, 3))).toBe(1);
	});

	it("should accept a sync source", async () => {
		expect(await firstAsync([1, 2])).toBe(1);
	});

	it("should return undefined for an empty source", async () => {
		expect(await firstAsync(asyncOf<number>())).toBeUndefined();
	});

	it("should pull exactly one element", async () => {
		const { source, produced } = countedAsync();

		expect(await firstAsync(source())).toBe(1);
		expect(produced()).toBe(1);
	});

	it("should reject an already-aborted signal", async () => {
		await expect(firstAsync(asyncOf(1), AbortSignal.abort())).rejects.toThrow();
	});
});

describe("lastAsync", () => {
	it("should return the last element", async () => {
		expect(await lastAsync(asyncOf(1, 2, 3))).toBe(3);
	});

	it("should accept a sync source", async () => {
		expect(await lastAsync([1, 2])).toBe(2);
	});

	it("should return undefined for an empty source", async () => {
		expect(await lastAsync(asyncOf<number>())).toBeUndefined();
	});

	it("should reject an already-aborted signal", async () => {
		await expect(lastAsync(asyncOf(1), AbortSignal.abort())).rejects.toThrow();
	});
});

describe("nthAsync", () => {
	it("should return the element at the given index", async () => {
		expect(await nthAsync(asyncOf(1, 2, 3), 1)).toBe(2);
	});

	it("should return undefined past the end", async () => {
		expect(await nthAsync(asyncOf(1, 2), 5)).toBeUndefined();
	});

	it("should pull only as far as the index", async () => {
		const { source, produced } = countedAsync();

		expect(await nthAsync(source(), 2)).toBe(3);
		expect(produced()).toBe(3);
	});

	it("should reject a negative or fractional index", async () => {
		await expect(nthAsync(asyncOf(1), -1)).rejects.toThrow(RangeError);
		await expect(nthAsync(asyncOf(1), 1.5)).rejects.toThrow(RangeError);
	});
});

describe("countAsync", () => {
	it("should count an async source", async () => {
		expect(await countAsync(asyncOf(1, 2, 3))).toBe(3);
	});

	it("should count a sync source", async () => {
		expect(await countAsync([1, 2])).toBe(2);
	});

	it("should return zero for an empty source", async () => {
		expect(await countAsync(asyncOf<number>())).toBe(0);
	});

	it("should reject an already-aborted signal", async () => {
		await expect(countAsync(asyncOf(1), AbortSignal.abort())).rejects.toThrow();
	});
});

describe("includesAsync", () => {
	it("should find a present item", async () => {
		expect(await includesAsync(asyncOf(1, 2, 3), 2)).toBe(true);
	});

	it("should not find an absent item", async () => {
		expect(await includesAsync(asyncOf(1, 2), 5)).toBe(false);
	});

	it("should default to sameValueZero", async () => {
		expect(await includesAsync(asyncOf(Number.NaN), Number.NaN)).toBe(true);
	});

	it("should use a custom comparator", async () => {
		expect(
			await includesAsync(
				asyncOf({ id: 1 }, { id: 2 }),
				{ id: 2 },
				(a, b) => a.id === b.id,
			),
		).toBe(true);
	});

	it("should short-circuit on the first match", async () => {
		const { source, produced } = countedAsync();

		expect(await includesAsync(source(), 2)).toBe(true);
		expect(produced()).toBe(2);
	});
});

describe("onlyAsync", () => {
	it("should return the single element", async () => {
		expect(await onlyAsync(asyncOf(42))).toBe(42);
	});

	it("should reject an empty source", async () => {
		await expect(onlyAsync(asyncOf<number>())).rejects.toThrow(RangeError);
	});

	it("should reject more than one element", async () => {
		await expect(onlyAsync(asyncOf(1, 2))).rejects.toThrow(RangeError);
	});

	it("should pull at most two elements from an endless source", async () => {
		const { source, produced } = countedAsync();

		await expect(onlyAsync(source())).rejects.toThrow(RangeError);
		expect(produced()).toBe(2);
	});

	it("should close the iterator when it rejects", async () => {
		const { source, returned } = closableAsync(5);

		await expect(onlyAsync(source())).rejects.toThrow(RangeError);
		expect(returned()).toBe(true);
	});
});

describe("oneAsync", () => {
	it("should return the single element", async () => {
		expect(await oneAsync(asyncOf(42))).toBe(42);
	});

	it("should return undefined for an empty source", async () => {
		expect(await oneAsync(asyncOf<number>())).toBeUndefined();
	});

	it("should reject more than one element", async () => {
		await expect(oneAsync(asyncOf(1, 2))).rejects.toThrow(RangeError);
	});
});
