import { expect, suite, test } from "vitest";

import { FuzzyMap } from "./fuzzy-map.js";
import { FuzzyMultiMap } from "./fuzzy-multi-map.js";

const lowerCase = (key: string): string => key.toLowerCase();

/** Case- and accent-insensitive, the archetypal real-world normaliser. */
const folded = (key: string): string =>
	key
		.normalize("NFD")
		.replaceAll(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();

suite("FuzzyMap", () => {
	const map = (
		entries?: Iterable<readonly [string, number]>,
	): FuzzyMap<string, number> =>
		new FuzzyMap(entries, { normalize: lowerCase });

	test("should match keys that normalise together", () => {
		const fuzzy = map([["Hello", 1]]);

		expect(fuzzy.get("hello")).toBe(1);
		expect(fuzzy.get("HELLO")).toBe(1);
		expect(fuzzy.has("HeLLo")).toBe(true);
		expect(fuzzy.get("goodbye")).toBeUndefined();
	});

	test("should hold one entry per normalised key", () => {
		const fuzzy = map();

		fuzzy.set("Foo", 1);
		fuzzy.set("FOO", 2);

		expect(fuzzy.count()).toBe(1);
		expect(fuzzy.get("foo")).toBe(2);
	});

	test("should keep the first spelling as the stored key", () => {
		const fuzzy = map();

		fuzzy.set("Foo", 1);
		fuzzy.set("FOO", 2);

		expect(Array.from(fuzzy.keys())).toEqual(["Foo"]);
		expect(fuzzy.storedKey("foo")).toBe("Foo");
		expect(fuzzy.storedKey("absent")).toBeUndefined();
	});

	test("should delete by any equivalent key", () => {
		const fuzzy = map([["Foo", 1]]);

		expect(fuzzy.delete("FOO")).toBe(true);
		expect(fuzzy.delete("FOO")).toBe(false);
		expect(fuzzy.count()).toBe(0);
	});

	test("should iterate keys, values and entries consistently", () => {
		const fuzzy = map([
			["A", 1],
			["b", 2],
		]);

		expect(Array.from(fuzzy.keys())).toEqual(["A", "b"]);
		expect(Array.from(fuzzy.values())).toEqual([1, 2]);
		expect(Array.from(fuzzy.entries())).toEqual([
			["A", 1],
			["b", 2],
		]);
		expect(Array.from(fuzzy)).toEqual(Array.from(fuzzy.entries()));
	});

	test("should clear every entry", () => {
		const fuzzy = map([["a", 1]]);

		fuzzy.clear();

		expect(fuzzy.count()).toBe(0);
		expect(fuzzy.has("a")).toBe(false);
	});

	test("should take any normalisation, not just case", () => {
		const fuzzy = new FuzzyMap<string, string>(undefined, {
			normalize: folded,
		});

		fuzzy.set("  Café  ", "coffee");

		expect(fuzzy.get("cafe")).toBe("coffee");
		expect(fuzzy.get("CAFÉ")).toBe("coffee");
	});

	test("should support a many-to-one normalisation collapsing distinct keys", () => {
		const byLength = new FuzzyMap<string, number>(undefined, {
			normalize: (key) => key.length,
		});

		byLength.set("abc", 1);
		byLength.set("xyz", 2);

		expect(byLength.count()).toBe(1);
		expect(byLength.get("123")).toBe(2);
	});
});

suite("FuzzyMultiMap", () => {
	const map = (
		entries?: Iterable<readonly [string, number]>,
	): FuzzyMultiMap<string, number> =>
		new FuzzyMultiMap(entries, { normalize: lowerCase });

	test("should gather values under one normalised key", () => {
		const fuzzy = map([
			["Tag", 1],
			["TAG", 2],
			["other", 3],
		]);

		expect(fuzzy.countFor("tag")).toBe(2);
		expect(Array.from(fuzzy.get("TAG"))).toEqual([1, 2]);
		expect(fuzzy.keyCount()).toBe(2);
		expect(fuzzy.count()).toBe(3);
	});

	test("should keep the first spelling as the bucket key", () => {
		const fuzzy = map([
			["Tag", 1],
			["TAG", 2],
		]);

		expect(Array.from(fuzzy.keys())).toEqual(["Tag"]);
		expect(fuzzy.storedKey("tag")).toBe("Tag");
	});

	test("should keep duplicate values", () => {
		const fuzzy = map();

		fuzzy.add("a", 1);
		fuzzy.add("A", 1);

		expect(Array.from(fuzzy.get("a"))).toEqual([1, 1]);
	});

	test("should addAll under one normalised key", () => {
		const fuzzy = map();

		fuzzy.addAll("Tag", [1, 2, 3]);

		expect(fuzzy.countFor("tag")).toBe(3);
	});

	test("should not create a bucket from an empty addAll", () => {
		const fuzzy = map();

		fuzzy.addAll("Tag", []);

		expect(fuzzy.has("tag")).toBe(false);
		expect(fuzzy.keyCount()).toBe(0);
	});

	test("should answer hasEntry across equivalent keys", () => {
		const fuzzy = map([["Tag", 1]]);

		expect(fuzzy.hasEntry("TAG", 1)).toBe(true);
		expect(fuzzy.hasEntry("TAG", 2)).toBe(false);
	});

	test("should delete a whole bucket and report the entries removed", () => {
		const fuzzy = map([
			["Tag", 1],
			["TAG", 2],
		]);

		expect(fuzzy.delete("tag")).toBe(2);
		expect(fuzzy.delete("tag")).toBe(0);
		expect(fuzzy.count()).toBe(0);
	});

	test("should delete one entry at a time and drop an emptied bucket", () => {
		const fuzzy = map([["Tag", 1]]);

		expect(fuzzy.deleteEntry("TAG", 1)).toBe(true);
		expect(fuzzy.deleteEntry("TAG", 1)).toBe(false);

		expect(fuzzy.has("tag")).toBe(false);
		expect(fuzzy.keyCount()).toBe(0);
	});

	test("should iterate every pair with the stored spelling", () => {
		const fuzzy = map([
			["Tag", 1],
			["TAG", 2],
		]);

		expect(Array.from(fuzzy)).toEqual([
			["Tag", 1],
			["Tag", 2],
		]);
	});

	test("should clear every bucket", () => {
		const fuzzy = map([["a", 1]]);

		fuzzy.clear();

		expect(fuzzy.count()).toBe(0);
		expect(fuzzy.keyCount()).toBe(0);
	});
});
