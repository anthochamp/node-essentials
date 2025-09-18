import { expect, suite, test } from "vitest";
import { kebabCase } from "./kebab-case.js";

suite("kebabCase", () => {
	test("converts strings to kebab case", () => {
		expect(kebabCase("hello world")).toBe("hello-world");
		expect(kebabCase("Hello World")).toBe("hello-world");
		expect(kebabCase("hello-world")).toBe("hello-world");
		expect(kebabCase("Hello-World")).toBe("hello-world");
		expect(kebabCase("hello_world")).toBe("hello-world");
		expect(kebabCase("Hello_World")).toBe("hello-world");
		expect(kebabCase("hello.world")).toBe("hello-world");
		expect(kebabCase("Hello.World")).toBe("hello-world");
		expect(kebabCase("  hello   world  ")).toBe("hello-world");
		expect(kebabCase("__hello__world__")).toBe("hello-world");
		expect(kebabCase("--hello--world--")).toBe("hello-world");
		expect(kebabCase("..hello..world..")).toBe("hello-world");
		expect(kebabCase("")).toBe("");
		expect(kebabCase("a")).toBe("a");
		expect(kebabCase("A")).toBe("a");
		expect(kebabCase("a b c")).toBe("a-b-c");
		expect(kebabCase("A B C")).toBe("a-b-c");
	});
});
