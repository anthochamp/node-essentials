import { expect, suite, test } from "vitest";

import { graphemeSegments, visibleWidth } from "./visible-width.js";

suite("visibleWidth", () => {
	test("counts one column per ASCII character", () => {
		expect(visibleWidth("hello")).toBe(5);
	});

	test("ignores control characters", () => {
		expect(visibleWidth("a\u0007b")).toBe(2);
	});

	test("counts a CJK ideograph as two columns", () => {
		expect(visibleWidth("中")).toBe(2);
		expect(visibleWidth("中文")).toBe(4);
	});

	test("counts a fullwidth character as two columns", () => {
		expect(visibleWidth("Ａ")).toBe(2);
	});

	test("counts a base character plus combining mark as one grapheme cluster", () => {
		// "e" + COMBINING ACUTE ACCENT (U+0301) — one user-perceived character.
		expect(visibleWidth("e\u0301")).toBe(1);
	});

	test("counts a family emoji ZWJ sequence as one wide grapheme cluster", () => {
		expect(visibleWidth("👨‍👩‍👧‍👦")).toBe(2);
	});

	test("mixes ASCII and wide characters correctly", () => {
		expect(visibleWidth("a中b")).toBe(4);
	});
});

suite("graphemeSegments", () => {
	test("splits ASCII text into individual characters", () => {
		expect(graphemeSegments("ab")).toEqual(["a", "b"]);
	});

	test("keeps a combining mark attached to its base character", () => {
		expect(graphemeSegments("e\u0301f")).toEqual(["e\u0301", "f"]);
	});

	test("strips control characters before segmenting", () => {
		expect(graphemeSegments("a\u0007b")).toEqual(["a", "b"]);
	});
});
