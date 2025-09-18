import { expect, suite, test } from "vitest";
import { capitalize } from "./capitalize.js";

suite("capitalize", () => {
	test("capitalizes the first letter and lowercases the rest", () => {
		expect(capitalize("hello world")).toBe("Hello world");
		expect(capitalize("Hello World")).toBe("Hello world");
		expect(capitalize("hELLO wORLD")).toBe("Hello world");
		expect(capitalize("")).toBe("");
		expect(capitalize("a")).toBe("A");
		expect(capitalize("A")).toBe("A");
		expect(capitalize("a b c")).toBe("A b c");
		expect(capitalize("A B C")).toBe("A b c");
	});
});
