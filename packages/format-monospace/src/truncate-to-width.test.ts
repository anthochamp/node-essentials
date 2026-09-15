import { expect, suite, test } from "vitest";

import { truncateToWidth } from "./truncate-to-width.js";

suite("truncateToWidth", () => {
	test("returns the original string if it already fits", () => {
		expect(truncateToWidth("hello", 10)).toBe("hello");
	});

	test("truncates at the end by default", () => {
		expect(truncateToWidth("hello world", 8)).toBe("hello w…");
	});

	test("truncates at the start", () => {
		expect(truncateToWidth("hello world", 8, { position: "start" })).toBe(
			"…o world",
		);
	});

	test("truncates in the middle", () => {
		expect(truncateToWidth("hello world", 8, { position: "middle" })).toBe(
			"hell…rld",
		);
	});

	test("uses a custom ellipsis string", () => {
		expect(truncateToWidth("hello world", 8, { ellipsisString: "..." })).toBe(
			"hello...",
		);
	});

	test("never splits a wide character in half", () => {
		// "中" is 2 columns; a width-1 budget cannot fit even one, but must not
		// emit half of it either.
		expect(truncateToWidth("中文", 3)).toBe("中…");
	});

	test("returns an empty string when maxWidth is below the ellipsis width and strictLength is true", () => {
		expect(truncateToWidth("hello", 0)).toBe("");
	});

	test("returns the untruncated ellipsis when strictLength is false", () => {
		expect(truncateToWidth("hello", 0, { strictLength: false })).toBe("…");
	});

	test("counts wide characters as two columns when truncating", () => {
		expect(truncateToWidth("中文字", 5)).toBe("中文…");
	});

	test("respects wordCutting option when false", () => {
		expect(
			truncateToWidth("hello world beautiful", 15, {
				position: "end",
				wordCutting: false,
			}),
		).toBe("hello world…");

		expect(
			truncateToWidth("hello world beautiful", 15, {
				position: "start",
				wordCutting: false,
			}),
		).toBe("…beautiful");

		expect(
			truncateToWidth("hello world beautiful", 15, {
				position: "middle",
				wordCutting: false,
			}),
		).toBe("hello…autiful");
	});
});
