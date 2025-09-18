import { expect, suite, test } from "vitest";
import { upperFirst } from "./upper-first.js";

suite("upperFirst", () => {
	test("converts the first letter of a string to upper case", () => {
		expect(upperFirst("hello world")).toBe("Hello world");
		expect(upperFirst("Hello world")).toBe("Hello world");
		expect(upperFirst("a")).toBe("A");
		expect(upperFirst("A")).toBe("A");
		expect(upperFirst("")).toBe("");
	});
});
