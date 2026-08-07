import { expect, suite, test } from "vitest";

import { buildSnakeCase, snakeCase } from "./snake-case.js";

suite("snakeCase", () => {
	test("converts strings to snake case", () => {
		expect(snakeCase("hello world")).toBe("hello_world");
		expect(snakeCase("Hello World")).toBe("hello_world");
		expect(snakeCase("hello-world")).toBe("hello_world");
		expect(snakeCase("Hello-World")).toBe("hello_world");
		expect(snakeCase("hello_world")).toBe("hello_world");
		expect(snakeCase("Hello_World")).toBe("hello_world");
		expect(snakeCase("hello.world")).toBe("hello_world");
		expect(snakeCase("Hello.World")).toBe("hello_world");
		expect(snakeCase("  hello   world  ")).toBe("hello_world");
		expect(snakeCase("__hello__world__")).toBe("hello_world");
		expect(snakeCase("--hello--world--")).toBe("hello_world");
		expect(snakeCase("..hello..world..")).toBe("hello_world");
		expect(snakeCase("")).toBe("");
		expect(snakeCase("a")).toBe("a");
		expect(snakeCase("A")).toBe("a");
		expect(snakeCase("a b c")).toBe("a_b_c");
		expect(snakeCase("A B C")).toBe("a_b_c");
		expect(snakeCase("foo / bar")).toBe("foo_/_bar");
	});
});

suite("buildSnakeCase", () => {
	test("accepts custom separators", () => {
		const toCase = buildSnakeCase({ separators: "[/]" });
		expect(toCase("src/util/helpers")).toBe("src_util_helpers");
		expect(toCase("hello world")).toBe("hello world");
	});
});
