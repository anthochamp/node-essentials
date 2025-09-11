import { describe, expect, it } from "vitest";
import { regexpEscape } from "./regexp-escape.js";

describe("regexpEscape", () => {
	it("should escape special regex characters", () => {
		const input = "Hello. How are you? (I hope you're well!)";
		const expectedOutput = "Hello\\. How are you\\? \\(I hope you're well!\\)";
		expect(regexpEscape(input)).toBe(expectedOutput);
	});

	it("should handle strings without special characters", () => {
		const input = "HelloWorld";
		const expectedOutput = "HelloWorld";
		expect(regexpEscape(input)).toBe(expectedOutput);
	});

	it("should handle empty strings", () => {
		const input = "";
		const expectedOutput = "";
		expect(regexpEscape(input)).toBe(expectedOutput);
	});

	it("should escape all special characters", () => {
		const input = ".*+?$^{}()|[]\\";
		const expectedOutput = "\\.\\*\\+\\?\\$\\^\\{\\}\\(\\)\\|\\[\\]\\\\";
		expect(regexpEscape(input)).toBe(expectedOutput);
	});
});
