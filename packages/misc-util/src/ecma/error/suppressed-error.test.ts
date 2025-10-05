import { expect, suite, test } from "vitest";
import { isSuppressedErrorLike } from "./suppressed-error.js";

suite("isSuppressedErrorLike", () => {
	test("should return true for Error instances", () => {
		expect(
			isSuppressedErrorLike(
				new SuppressedError(new Error("Inner error"), "error", "suppressed"),
			),
		).toBe(true);

		expect(
			isSuppressedErrorLike(
				new (class MyError extends SuppressedError {})(
					new Error(),
					"err",
					"sup",
				),
			),
		).toBe(true);
	});

	test("should return true for objects with name, message, cause, error and suppressed properties", () => {
		expect(
			isSuppressedErrorLike({
				name: "CustomError",
				message: "This is a custom error",
				cause: new Error("Inner error"),
				error: "Some error",
				suppressed: "Some suppressed error",
			}),
		).toBe(true);
	});

	test("should return false for objects missing name or message properties", () => {
		expect(isSuppressedErrorLike(new Error("Test error"))).toBe(false);
		expect(
			isSuppressedErrorLike(new (class MyError extends Error {})("Test error")),
		).toBe(false);
		expect(
			isSuppressedErrorLike({
				name: "CustomError",
				message: "This is a custom error",
			}),
		).toBe(false);
		expect(isSuppressedErrorLike({ name: "NoMessage" })).toBe(false);
		expect(isSuppressedErrorLike({ message: "NoName" })).toBe(false);
		expect(isSuppressedErrorLike({})).toBe(false);
	});

	test("should return false for non-object values", () => {
		expect(isSuppressedErrorLike(null)).toBe(false);
		expect(isSuppressedErrorLike(undefined)).toBe(false);
		expect(isSuppressedErrorLike(42)).toBe(false);
		expect(isSuppressedErrorLike("Not an error")).toBe(false);
		expect(isSuppressedErrorLike([])).toBe(false);
	});
});
