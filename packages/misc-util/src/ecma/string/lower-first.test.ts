import { expect, suite, test } from "vitest";
import { lowerFirst } from "./lower-first.js";

suite("lowerFirst", () => {
	test("converts the first letter of a string to lower case", () => {
		expect(lowerFirst("Hello World")).toBe("hello World");
		expect(lowerFirst("hello World")).toBe("hello World");
		expect(lowerFirst("A")).toBe("a");
		expect(lowerFirst("a")).toBe("a");
		expect(lowerFirst("")).toBe("");
	});
});
