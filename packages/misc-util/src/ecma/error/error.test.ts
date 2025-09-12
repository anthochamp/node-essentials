import { describe, expect, it } from "vitest";
import { isErrorLike } from "./error.js";

describe("isErrorLike", () => {
	it("should return true for Error instances", () => {
		expect(isErrorLike(new Error("Test error"))).toBe(true);

		expect(
			isErrorLike(new (class MyError extends Error {})("Test error")),
		).toBe(true);
	});

	it("should return true for objects with name and message properties", () => {
		expect(
			isErrorLike({ name: "CustomError", message: "This is a custom error" }),
		).toBe(true);
	});

	it("should return false for objects missing name or message properties", () => {
		expect(isErrorLike({ name: "NoMessage" })).toBe(false);
		expect(isErrorLike({ message: "NoName" })).toBe(false);
		expect(isErrorLike({})).toBe(false);
	});

	it("should return false for non-object values", () => {
		expect(isErrorLike(null)).toBe(false);
		expect(isErrorLike(undefined)).toBe(false);
		expect(isErrorLike(42)).toBe(false);
		expect(isErrorLike("Not an error")).toBe(false);
		expect(isErrorLike([])).toBe(false);
	});
});
