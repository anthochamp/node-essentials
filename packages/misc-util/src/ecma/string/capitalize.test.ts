import { describe, expect, it } from "vitest";
import { capitalize } from "./capitalize.js";

describe("capitalize", () => {
	it("should capitalize the first letter of a string", () => {
		expect(capitalize("hello")).toBe("Hello");
		expect(capitalize("world")).toBe("World");
	});
	it("should handle empty strings", () => {
		expect(capitalize("")).toBe("");
	});
	it("should not change the case of other letters", () => {
		expect(capitalize("hELLO")).toBe("HELLO");
		expect(capitalize("hello world")).toBe("Hello world");
	});
});
