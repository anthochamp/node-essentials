import { expect, suite, test } from "vitest";
import { prefixLines } from "./prefix-lines.js";

suite("prefixLines", () => {
	test("should prefix lines correctly", () => {
		const text = "Line 1\n\nLine 3\nLine 4";
		const prefix = "> ";
		const result = prefixLines(text, prefix);
		expect(result).toEqual(["> Line 1", "> ", "> Line 3", "> Line 4"]);
	});

	test("should handle skipFirstLine option", () => {
		const text = "Line 1\n\nLine 3\nLine 4";
		const prefix = "> ";
		const result = prefixLines(text, prefix, { skipFirstLine: true });
		expect(result).toEqual(["Line 1", "> ", "> Line 3", "> Line 4"]);
	});

	test("should handle skipEmptyLines option", () => {
		const text = "Line 1\n\nLine 3\nLine 4";
		const prefix = "> ";
		const result = prefixLines(text, prefix, { skipEmptyLines: true });
		expect(result).toEqual(["> Line 1", "", "> Line 3", "> Line 4"]);
	});
});
