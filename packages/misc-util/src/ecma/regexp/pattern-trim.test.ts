import { expect, suite, test } from "vitest";
import {
	buildPatternTrim,
	buildPatternTrimEnd,
	buildPatternTrimStart,
	patternTrim,
	patternTrimEnd,
	patternTrimStart,
} from "./pattern-trim.js";

suite("patternTrim", () => {
	test("should trim whitespace by default", () => {
		expect(patternTrim("  hello  ")).toBe("hello");
		expect(patternTrimStart("  hello  ")).toBe("hello  ");
		expect(patternTrimEnd("  hello  ")).toBe("  hello");
	});

	test("should trim custom pattern", () => {
		const pattern = "[abc]";
		expect(patternTrim("abchelloabc", pattern)).toBe("hello");
		expect(patternTrimStart("abchelloabc", pattern)).toBe("helloabc");
		expect(patternTrimEnd("abchelloabc", pattern)).toBe("abchello");
	});

	test("should handle empty string", () => {
		expect(patternTrim("", "[abc]")).toBe("");
		expect(patternTrimStart("", "[abc]")).toBe("");
		expect(patternTrimEnd("", "[abc]")).toBe("");
	});

	test("should handle string with no matches", () => {
		expect(patternTrim("hello", "[abc]")).toBe("hello");
		expect(patternTrimStart("hello", "[abc]")).toBe("hello");
		expect(patternTrimEnd("hello", "[abc]")).toBe("hello");
	});

	test("should handle pattern that matches entire string", () => {
		const pattern = ".";
		expect(patternTrim("aaaaaa", pattern)).toBe("");
		expect(patternTrimStart("aaaaaa", pattern)).toBe("");
		expect(patternTrimEnd("aaaaaa", pattern)).toBe("");
	});
});

suite("buildPatternTrim", () => {
	test("trims whitespace by default", () => {
		const trim = buildPatternTrim();
		const trimStart = buildPatternTrimStart();
		const trimEnd = buildPatternTrimEnd();
		expect(trim("  hello  ")).toBe("hello");
		expect(trimStart("  hello  ")).toBe("hello  ");
		expect(trimEnd("  hello  ")).toBe("  hello");
	});

	test("compiles regex once and reuses across calls", () => {
		const trim = buildPatternTrim("[abc]");
		const trimStart = buildPatternTrimStart("[abc]");
		const trimEnd = buildPatternTrimEnd("[abc]");
		expect(trim("abchelloabc")).toBe("hello");
		expect(trim("abchelloabc")).toBe("hello");
		expect(trimStart("abchelloabc")).toBe("helloabc");
		expect(trimEnd("abchelloabc")).toBe("abchello");
	});

	test("handles empty string", () => {
		const trim = buildPatternTrim("[abc]");
		expect(trim("")).toBe("");
	});

	test("handles string with no matches", () => {
		const trim = buildPatternTrim("[abc]");
		expect(trim("hello")).toBe("hello");
	});
});
