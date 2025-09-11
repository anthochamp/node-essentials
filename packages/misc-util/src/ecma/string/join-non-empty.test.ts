import { describe, expect, it } from "vitest";
import { joinNonEmpty } from "./join-non-empty.js";

describe("joinNonEmpty", () => {
	it("should join non-empty strings with the specified separator", () => {
		const values = ["Hello", "", "World", "", "!"];
		const separator = " ";
		const result = joinNonEmpty(values, separator);
		expect(result).toBe("Hello World !");
	});

	it("should return an empty string if all values are empty", () => {
		const values = ["", "", ""];
		const separator = ", ";
		const result = joinNonEmpty(values, separator);
		expect(result).toBe("");
	});

	it("should handle an empty array", () => {
		const values: string[] = [];
		const separator = ", ";
		const result = joinNonEmpty(values, separator);
		expect(result).toBe("");
	});

	it("should handle no empty strings in the array", () => {
		const values = ["One", "Two", "Three"];
		const separator = "-";
		const result = joinNonEmpty(values, separator);
		expect(result).toBe("One-Two-Three");
	});
});
