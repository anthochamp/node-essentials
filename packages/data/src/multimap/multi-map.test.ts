import { expect, suite, test } from "vitest";

import { MultiMap } from "./multi-map.js";

suite("MultiMap", () => {
	test("should count entries, not keys", () => {
		const map = new MultiMap<string, number>([
			["a", 1],
			["a", 2],
			["b", 3],
		]);

		expect(map.count()).toBe(3);
		expect(map.keyCount()).toBe(2);
		expect(map.countFor("a")).toBe(2);
		expect(map.countFor("missing")).toBe(0);
	});

	test("should keep duplicate values under one key", () => {
		const map = new MultiMap<string, number>();

		map.add("a", 1);
		map.add("a", 1);

		expect(map.countFor("a")).toBe(2);
		expect(Array.from(map.get("a"))).toEqual([1, 1]);
	});

	test("should keep values in insertion order", () => {
		const map = new MultiMap<string, number>();

		map.add("a", 3);
		map.add("a", 1);
		map.add("a", 2);

		expect(Array.from(map.get("a"))).toEqual([3, 1, 2]);
	});

	test("should yield nothing for an absent key", () => {
		const map = new MultiMap<string, number>();

		expect(Array.from(map.get("missing"))).toEqual([]);
		expect(map.has("missing")).toBe(false);
	});

	test("should addAll under one key", () => {
		const map = new MultiMap<string, number>();

		map.addAll("a", [1, 2, 3]);

		expect(map.countFor("a")).toBe(3);
		expect(map.count()).toBe(3);
	});

	test("should not create a key from an empty addAll", () => {
		const map = new MultiMap<string, number>();

		map.addAll("a", []);

		expect(map.has("a")).toBe(false);
		expect(map.keyCount()).toBe(0);
	});

	test("should not strand an empty bucket when addAll adds to a held key", () => {
		const map = new MultiMap<string, number>([["a", 1]]);

		map.addAll("a", []);

		expect(map.has("a")).toBe(true);
		expect(map.countFor("a")).toBe(1);
	});

	test("should answer hasEntry per (key, value) pair", () => {
		const map = new MultiMap<string, number>([["a", 1]]);

		expect(map.hasEntry("a", 1)).toBe(true);
		expect(map.hasEntry("a", 2)).toBe(false);
		expect(map.hasEntry("b", 1)).toBe(false);
	});

	test("should delete a whole key and report how many entries went", () => {
		const map = new MultiMap<string, number>([
			["a", 1],
			["a", 2],
			["b", 3],
		]);

		expect(map.delete("a")).toBe(2);
		expect(map.delete("a")).toBe(0);

		expect(map.count()).toBe(1);
		expect(map.keyCount()).toBe(1);
	});

	test("should delete one occurrence at a time, first one first", () => {
		const map = new MultiMap<string, number>([
			["a", 1],
			["a", 2],
			["a", 1],
		]);

		expect(map.deleteEntry("a", 1)).toBe(true);

		expect(Array.from(map.get("a"))).toEqual([2, 1]);
		expect(map.count()).toBe(2);
	});

	test("should drop a key once its last value is deleted", () => {
		const map = new MultiMap<string, number>([["a", 1]]);

		expect(map.deleteEntry("a", 1)).toBe(true);

		expect(map.has("a")).toBe(false);
		expect(map.keyCount()).toBe(0);
		expect(Array.from(map.keys())).toEqual([]);
	});

	test("should report a deleteEntry that matched nothing", () => {
		const map = new MultiMap<string, number>([["a", 1]]);

		expect(map.deleteEntry("a", 99)).toBe(false);
		expect(map.deleteEntry("missing", 1)).toBe(false);
		expect(map.count()).toBe(1);
	});

	test("should iterate every pair, grouped by key", () => {
		const map = new MultiMap<string, number>([
			["a", 1],
			["b", 2],
			["a", 3],
		]);

		expect(Array.from(map)).toEqual([
			["a", 1],
			["a", 3],
			["b", 2],
		]);
		expect(Array.from(map.keys())).toEqual(["a", "b"]);
	});

	test("should clear every entry", () => {
		const map = new MultiMap<string, number>([["a", 1]]);

		map.clear();

		expect(map.count()).toBe(0);
		expect(map.keyCount()).toBe(0);
		expect(Array.from(map)).toEqual([]);
	});
});
