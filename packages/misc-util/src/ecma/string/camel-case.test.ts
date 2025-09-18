import { expect, suite, test } from "vitest";
import { camelCase } from "./camel-case.js";

suite("camelCase", () => {
	test("converts strings to camel case", () => {
		expect(camelCase("hello world")).toBe("helloWorld");
		expect(camelCase("Hello World")).toBe("helloWorld");
		expect(camelCase("hello-world")).toBe("helloWorld");
		expect(camelCase("Hello-World")).toBe("helloWorld");
		expect(camelCase("hello_world")).toBe("helloWorld");
		expect(camelCase("Hello_World")).toBe("helloWorld");
		expect(camelCase("hello.world")).toBe("helloWorld");
		expect(camelCase("Hello.World")).toBe("helloWorld");
		expect(camelCase("  hello   world  ")).toBe("helloWorld");
		expect(camelCase("__hello__world__")).toBe("helloWorld");
		expect(camelCase("--hello--world--")).toBe("helloWorld");
		expect(camelCase("..hello..world..")).toBe("helloWorld");
		expect(camelCase("")).toBe("");
		expect(camelCase("a")).toBe("a");
		expect(camelCase("A")).toBe("a");
		expect(camelCase("a b c")).toBe("aBC");
		expect(camelCase("A B C")).toBe("aBC");
	});
});
