import { expect, suite, test } from "vitest";
import { startCase } from "./start-case.js";

suite("startCase", () => {
	test("converts strings to start case", () => {
		expect(startCase("hello world")).toBe("Hello World");
		expect(startCase("Hello World")).toBe("Hello World");
		expect(startCase("hello-world")).toBe("Hello World");
		expect(startCase("Hello-World")).toBe("Hello World");
		expect(startCase("hello_world")).toBe("Hello World");
		expect(startCase("Hello_World")).toBe("Hello World");
		expect(startCase("hello.world")).toBe("Hello World");
		expect(startCase("Hello.World")).toBe("Hello World");
		expect(startCase("  hello   world  ")).toBe("Hello World");
		expect(startCase("__hello__world__")).toBe("Hello World");
		expect(startCase("--hello--world--")).toBe("Hello World");
		expect(startCase("..hello..world..")).toBe("Hello World");
		expect(startCase("")).toBe("");
		expect(startCase("a")).toBe("A");
		expect(startCase("A")).toBe("A");
		expect(startCase("a b c")).toBe("A B C");
		expect(startCase("A B C")).toBe("A B C");
	});
});
