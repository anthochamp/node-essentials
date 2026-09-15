import { describe, expect, it } from "vitest";

import { mergeSpans, spanText, syntheticSpan } from "./span.js";

describe("syntheticSpan", () => {
	it("returns a zero-length span at offset 0 by default", () => {
		expect(syntheticSpan()).toEqual({ start: 0, end: 0 });
	});

	it("returns a zero-length span at the given offset", () => {
		expect(syntheticSpan(5)).toEqual({ start: 5, end: 5 });
	});
});

describe("mergeSpans", () => {
	it("returns the smallest span containing both inputs", () => {
		expect(mergeSpans({ start: 2, end: 5 }, { start: 8, end: 10 })).toEqual({
			start: 2,
			end: 10,
		});
	});

	it("handles overlapping spans", () => {
		expect(mergeSpans({ start: 4, end: 9 }, { start: 2, end: 6 })).toEqual({
			start: 2,
			end: 9,
		});
	});
});

describe("spanText", () => {
	it("returns the substring covered by the span", () => {
		expect(spanText("hello world", { start: 6, end: 11 })).toBe("world");
	});

	it("returns an empty string for a zero-length span", () => {
		expect(spanText("hello world", syntheticSpan(3))).toBe("");
	});
});
