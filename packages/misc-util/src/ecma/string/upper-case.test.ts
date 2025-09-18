import { expect, suite, test } from "vitest";
import { upperCase } from "./upper-case.js";

suite("upperCase", () => {
	test("converts strings to upper case", () => {
		expect(upperCase("hello world")).toBe("HELLO WORLD");
		expect(upperCase("Hello World")).toBe("HELLO WORLD");
		expect(upperCase("hello-world")).toBe("HELLO WORLD");
		expect(upperCase("Hello-World")).toBe("HELLO WORLD");
		expect(upperCase("hello_world")).toBe("HELLO WORLD");
		expect(upperCase("Hello_World")).toBe("HELLO WORLD");
		expect(upperCase("hello.world")).toBe("HELLO WORLD");
		expect(upperCase("Hello.World")).toBe("HELLO WORLD");
		expect(upperCase("  hello   world  ")).toBe("HELLO WORLD");
		expect(upperCase("__hello__world__")).toBe("HELLO WORLD");
		expect(upperCase("--hello--world--")).toBe("HELLO WORLD");
		expect(upperCase("..hello..world..")).toBe("HELLO WORLD");
		expect(upperCase("")).toBe("");
		expect(upperCase("a")).toBe("A");
		expect(upperCase("A")).toBe("A");
		expect(upperCase("a b c")).toBe("A B C");
		expect(upperCase("A B C")).toBe("A B C");
	});
});
