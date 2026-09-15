import { describe, expect, it } from "vitest";

import { applyTextEdits } from "./apply-text-edits.js";

describe("applyTextEdits", () => {
	it("applies a single full-replace edit", () => {
		const source = '{"a":1}';
		const result = applyTextEdits(source, [
			{ offset: 0, length: source.length, content: '{"a":2}' },
		]);
		expect(result).toBe('{"a":2}');
	});

	it("applies multiple non-overlapping edits in descending offset order", () => {
		const source = "hello world";
		const result = applyTextEdits(source, [
			{ offset: 0, length: 5, content: "hi" },
			{ offset: 6, length: 5, content: "earth" },
		]);
		expect(result).toBe("hi earth");
	});

	it("returns source unchanged for empty edits array", () => {
		const source = '{"a":1}';
		expect(applyTextEdits(source, [])).toBe(source);
	});
});
