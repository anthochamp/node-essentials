import { describe, expect, it } from "vitest";

import { mapAsync } from "./async/map.js";
import { map } from "./map.js";

describe("map", () => {
	it("yields the mapped values", () => {
		expect([...map([1, 2, 3], (value) => value * 2)]).toStrictEqual([2, 4, 6]);
	});

	it("passes the zero-based index", () => {
		expect([
			...map(["a", "b"], (value, index) => `${index}${value}`),
		]).toStrictEqual(["0a", "1b"]);
	});

	it("changes the element type", () => {
		expect([...map([1, 2], (value) => `#${value}`)]).toStrictEqual([
			"#1",
			"#2",
		]);
	});

	it("is lazy", () => {
		let calls = 0;
		const iterator = map([1, 2, 3], (value) => {
			calls++;
			return value;
		});

		expect(calls).toBe(0);
		iterator.next();
		expect(calls).toBe(1);
	});

	it("accepts any iterable", () => {
		expect([...map(new Set([1, 2]), (value) => value + 1)]).toStrictEqual([
			2, 3,
		]);
	});

	it("yields nothing for an empty input", () => {
		expect([...map([], (value) => value)]).toStrictEqual([]);
	});
});

describe("mapAsync", () => {
	it("maps a sync iterable", async () => {
		const result: number[] = [];
		for await (const value of mapAsync([1, 2], (item) => item * 2)) {
			result.push(value);
		}

		expect(result).toStrictEqual([2, 4]);
	});

	it("awaits an async mapper", async () => {
		const result: number[] = [];
		for await (const value of mapAsync([1, 2], async (item) => item + 1)) {
			result.push(value);
		}

		expect(result).toStrictEqual([2, 3]);
	});

	it("maps an async iterable", async () => {
		async function* source(): AsyncGenerator<number> {
			yield 1;
			yield 2;
		}

		const result: number[] = [];
		for await (const value of mapAsync(
			source(),
			(item, index) => item + index,
		)) {
			result.push(value);
		}

		expect(result).toStrictEqual([1, 3]);
	});
});
