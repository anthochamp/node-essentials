import { expect, suite, test } from "vitest";

import { Trie } from "./trie.js";

suite("Trie", () => {
	/** Convenience: this trie is generic over segments, so strings must be split. */
	const chars = (word: string): readonly string[] => Array.from(word);

	const wordTrie = (...words: readonly string[]): Trie<string, number> => {
		const trie = new Trie<string, number>();

		for (const [index, word] of words.entries()) {
			trie.set(chars(word), index);
		}

		return trie;
	};

	test("should store and read back a key", () => {
		const trie = wordTrie("cat", "car");

		expect(trie.get(chars("cat"))).toBe(0);
		expect(trie.get(chars("car"))).toBe(1);
		expect(trie.get(chars("dog"))).toBeUndefined();
		expect(trie.count()).toBe(2);
	});

	test("should overwrite rather than duplicate a stored key", () => {
		const trie = wordTrie("cat");

		trie.set(chars("cat"), 99);

		expect(trie.get(chars("cat"))).toBe(99);
		expect(trie.count()).toBe(1);
	});

	test("should accept the empty key, addressing the root", () => {
		const trie = new Trie<string, number>();

		trie.set([], 7);

		expect(trie.get([])).toBe(7);
		expect(trie.has([])).toBe(true);
		expect(trie.count()).toBe(1);
	});

	test("should distinguish a stored undefined value from an absent key", () => {
		const trie = new Trie<string, any>();

		trie.set(chars("a"), undefined);

		expect(trie.get(chars("a"))).toBeUndefined();
		expect(trie.has(chars("a"))).toBe(true);
		expect(trie.has(chars("b"))).toBe(false);
	});

	test("should tell a stored key from a mere prefix", () => {
		const trie = wordTrie("cat");

		expect(trie.has(chars("ca"))).toBe(false);
		expect(trie.hasPrefix(chars("ca"))).toBe(true);
		expect(trie.hasPrefix(chars("dog"))).toBe(false);
		expect(trie.hasPrefix([])).toBe(true);
	});

	test("should store a key that is a prefix of another", () => {
		const trie = wordTrie("car", "cart");

		expect(trie.get(chars("car"))).toBe(0);
		expect(trie.get(chars("cart"))).toBe(1);
		expect(trie.count()).toBe(2);
	});

	test("should take a segment type other than characters", () => {
		const trie = new Trie<string, string>();

		trie.set(["users", ":id"], "user detail");
		trie.set(["users"], "user list");

		expect(trie.get(["users", ":id"])).toBe("user detail");
		expect(Array.from(trie.keys())).toEqual([["users"], ["users", ":id"]]);
	});

	suite("delete", () => {
		test("should remove a key and report it", () => {
			const trie = wordTrie("cat");

			expect(trie.delete(chars("cat"))).toBe(true);
			expect(trie.delete(chars("cat"))).toBe(false);

			expect(trie.count()).toBe(0);
			expect(trie.has(chars("cat"))).toBe(false);
		});

		test("should refuse to delete a prefix that is not itself a key", () => {
			const trie = wordTrie("cat");

			expect(trie.delete(chars("ca"))).toBe(false);
			expect(trie.get(chars("cat"))).toBe(0);
		});

		test("should prune the branch it emptied", () => {
			const trie = wordTrie("cat");

			trie.delete(chars("cat"));

			expect(trie.hasPrefix(chars("c"))).toBe(false);
		});

		test("should keep a branch still carrying another key", () => {
			const trie = wordTrie("car", "cart");

			trie.delete(chars("cart"));

			expect(trie.get(chars("car"))).toBe(0);
			expect(trie.hasPrefix(chars("car"))).toBe(true);
			expect(trie.hasPrefix(chars("cart"))).toBe(false);
		});

		test("should keep a shorter key when a longer one through it is deleted", () => {
			const trie = wordTrie("car", "cart");

			trie.delete(chars("car"));

			expect(trie.get(chars("cart"))).toBe(1);
			expect(trie.has(chars("car"))).toBe(false);
			expect(trie.count()).toBe(1);
		});

		test("should not prune past the root when the empty key is deleted", () => {
			const trie = new Trie<string, number>();

			trie.set([], 1);
			trie.set(chars("a"), 2);

			expect(trie.delete([])).toBe(true);

			expect(trie.get(chars("a"))).toBe(2);
			expect(trie.count()).toBe(1);
		});
	});

	suite("prefix queries", () => {
		test("should yield every entry under a prefix, including the prefix itself", () => {
			const trie = wordTrie("car", "cart", "care", "dog");

			const found = Array.from(trie.withPrefix(chars("car")), ([key]) =>
				key.join(""),
			);

			expect(found.sort()).toEqual(["car", "care", "cart"]);
		});

		test("should yield nothing for an unknown prefix", () => {
			const trie = wordTrie("cat");

			expect(Array.from(trie.withPrefix(chars("dog")))).toEqual([]);
		});

		test("should yield everything for the empty prefix", () => {
			const trie = wordTrie("a", "b");

			expect(Array.from(trie.withPrefix([]))).toHaveLength(2);
		});

		test("should find the longest stored key that prefixes a query", () => {
			const trie = wordTrie("a", "ab", "abcd");

			expect(trie.longestPrefixOf(chars("abcde"))).toEqual(chars("abcd"));
			expect(trie.longestPrefixOf(chars("abc"))).toEqual(chars("ab"));
			expect(trie.longestPrefixOf(chars("a"))).toEqual(chars("a"));
			expect(trie.longestPrefixOf(chars("xyz"))).toBeUndefined();
		});

		test("should treat a stored empty key as the fallback longest prefix", () => {
			const trie = new Trie<string, number>();

			trie.set([], 0);
			trie.set(chars("ab"), 1);

			expect(trie.longestPrefixOf(chars("xyz"))).toEqual([]);
			expect(trie.longestPrefixOf(chars("abc"))).toEqual(chars("ab"));
		});
	});

	test("should iterate keys, values and entries consistently", () => {
		const trie = wordTrie("b", "a");

		const entries = Array.from(trie.entries());
		const keys = Array.from(trie.keys());
		const values = Array.from(trie.values());

		expect(keys).toEqual(entries.map(([key]) => key));
		expect(values).toEqual(entries.map(([, value]) => value));
		expect(Array.from(trie)).toEqual(entries);
	});

	test("should not alias the key arrays it yields", () => {
		const trie = wordTrie("ab", "ac");

		const [first, second] = Array.from(trie.keys());

		expect(first).not.toBe(second);
		expect(first).toEqual(chars("ab"));
		expect(second).toEqual(chars("ac"));
	});

	test("should clear every entry", () => {
		const trie = wordTrie("a", "b");

		trie.clear();

		expect(trie.count()).toBe(0);
		expect(trie.hasPrefix(chars("a"))).toBe(false);
		expect(Array.from(trie)).toEqual([]);
	});

	test("should accept an initial iterable of entries", () => {
		const trie = new Trie<string, number>([
			[chars("a"), 1],
			[chars("b"), 2],
		]);

		expect(trie.count()).toBe(2);
		expect(trie.get(chars("a"))).toBe(1);
	});
});
