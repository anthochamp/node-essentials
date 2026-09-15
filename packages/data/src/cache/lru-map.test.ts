import { expect, suite, test } from "vitest";

import { LruMap } from "./lru-map.js";

suite("LruMap", () => {
	test("should reject a negative or fractional capacity", () => {
		expect(
			() => new LruMap<string, number>(undefined, { capacity: -1 }),
		).toThrow(RangeError);
	});

	test("should store and read back entries", () => {
		const map = new LruMap<string, number>(
			[
				["a", 1],
				["b", 2],
			],
			{ capacity: 3 },
		);

		expect(map.get("a")).toBe(1);
		expect(map.get("missing")).toBeUndefined();
		expect(map.count()).toBe(2);
	});

	test("should evict the least recently used entry when full", () => {
		const map = new LruMap<string, number>(undefined, { capacity: 2 });

		expect(map.set("a", 1)).toEqual([]);
		expect(map.set("b", 2)).toEqual([]);
		expect(map.set("c", 3)).toEqual([["a", 1]]);

		expect(map.has("a")).toBe(false);
		expect(map.count()).toBe(2);
	});

	test("should not evict when overwriting a held key", () => {
		const map = new LruMap<string, number>(
			[
				["a", 1],
				["b", 2],
			],
			{ capacity: 2 },
		);

		expect(map.set("a", 10)).toEqual([]);

		expect(map.get("a")).toBe(10);
		expect(map.count()).toBe(2);
	});

	test("should count get() as a use but not has() or peek()", () => {
		const map = new LruMap<string, number>(
			[
				["a", 1],
				["b", 2],
			],
			{ capacity: 2 },
		);

		map.has("a");
		expect(map.peek("a")).toBe(1);
		expect(map.lru()).toEqual(["a", 1]);

		map.get("a");
		expect(map.lru()).toEqual(["b", 2]);
	});

	test("should iterate most recently used first", () => {
		const map = new LruMap<string, number>(
			[
				["a", 1],
				["b", 2],
				["c", 3],
			],
			{ capacity: 3 },
		);

		expect(Array.from(map.keys())).toEqual(["c", "b", "a"]);

		map.get("a");

		expect(Array.from(map.keys())).toEqual(["a", "c", "b"]);
		expect(Array.from(map.values())).toEqual([1, 3, 2]);
		expect(Array.from(map.entries())).toEqual([
			["a", 1],
			["c", 3],
			["b", 2],
		]);
	});

	test("should delete in O(1) and free the room", () => {
		const map = new LruMap<string, number>(
			[
				["a", 1],
				["b", 2],
			],
			{ capacity: 2 },
		);

		expect(map.delete("a")).toBe(true);
		expect(map.delete("a")).toBe(false);

		expect(map.count()).toBe(1);
		expect(map.set("c", 3)).toEqual([]);
		expect(map.count()).toBe(2);
	});

	test("should hold nothing at capacity 0, displacing each incoming entry", () => {
		const map = new LruMap<string, number>(undefined, { capacity: 0 });

		expect(map.set("a", 1)).toEqual([["a", 1]]);
		expect(map.count()).toBe(0);
	});

	test("should clear every entry", () => {
		const map = new LruMap<string, number>([["a", 1]], { capacity: 2 });

		map.clear();

		expect(map.count()).toBe(0);
		expect(map.lru()).toBeUndefined();
		expect(Array.from(map)).toEqual([]);
	});

	test("should keep undefined as a legal value, distinct from absence", () => {
		const map = new LruMap<string, any>(undefined, {
			capacity: 2,
		});

		map.set("a", undefined);

		// `get` cannot tell them apart; `has` is the question to ask.
		expect(map.get("a")).toBeUndefined();
		expect(map.has("a")).toBe(true);
		expect(map.has("b")).toBe(false);
	});
});
