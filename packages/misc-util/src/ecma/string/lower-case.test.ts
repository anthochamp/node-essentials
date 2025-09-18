import { expect, suite, test } from "vitest";
import { lowerCase } from "./lower-case.js";

suite("lowerCase", () => {
	test("converts strings to lower case with spaces", () => {
		expect(lowerCase("hello world")).toBe("hello world");
		expect(lowerCase("Hello World")).toBe("hello world");
		expect(lowerCase("hello-world")).toBe("hello world");
		expect(lowerCase("Hello-World")).toBe("hello world");
		expect(lowerCase("hello_world")).toBe("hello world");
		expect(lowerCase("Hello_World")).toBe("hello world");
		expect(lowerCase("hello.world")).toBe("hello world");
		expect(lowerCase("Hello.World")).toBe("hello world");
		expect(lowerCase("  hello   world  ")).toBe("hello world");
		expect(lowerCase("__hello__world__")).toBe("hello world");
		expect(lowerCase("--hello--world--")).toBe("hello world");
		expect(lowerCase("..hello..world..")).toBe("hello world");
		expect(lowerCase("")).toBe("");
		expect(lowerCase("a")).toBe("a");
		expect(lowerCase("A")).toBe("a");
		expect(lowerCase("a b c")).toBe("a b c");
		expect(lowerCase("A B C")).toBe("a b c");
	});
});
