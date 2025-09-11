import { describe, expect, it } from "vitest";
import { isAggregateErrorLike } from "./aggregate-error.js";

describe("isAggregateErrorLike", () => {
	it("should return true for Error instances", () => {
		expect(isAggregateErrorLike(new AggregateError([], "Test error"))).toBe(
			true,
		);

		expect(
			isAggregateErrorLike(
				new (class MyError extends AggregateError {})([], "Test error"),
			),
		).toBe(true);
	});

	it("should return true for objects with name, message and errors properties", () => {
		expect(
			isAggregateErrorLike({
				name: "CustomError",
				message: "This is a custom error",
				errors: [new Error("Inner error 1"), new Error("Inner error 2")],
			}),
		).toBe(true);
	});

	it("should return false for objects missing name or message properties", () => {
		expect(isAggregateErrorLike(new Error("Test error"))).toBe(false);
		expect(
			isAggregateErrorLike(new (class MyError extends Error {})("Test error")),
		).toBe(false);
		expect(
			isAggregateErrorLike({
				name: "CustomError",
				message: "This is a custom error",
			}),
		).toBe(false);
		expect(isAggregateErrorLike({ name: "NoMessage" })).toBe(false);
		expect(isAggregateErrorLike({ message: "NoName" })).toBe(false);
		expect(isAggregateErrorLike({})).toBe(false);
	});

	it("should return false for non-object values", () => {
		expect(isAggregateErrorLike(null)).toBe(false);
		expect(isAggregateErrorLike(undefined)).toBe(false);
		expect(isAggregateErrorLike(42)).toBe(false);
		expect(isAggregateErrorLike("Not an error")).toBe(false);
		expect(isAggregateErrorLike([])).toBe(false);
	});
});
