/** biome-ignore-all lint/style/noNonNullAssertion: tests */
import { describe, expect, it } from "vitest";
import { jsonMakeErrorReplacerFunction } from "./error.js";

const error = new Error("Test error");
const nestedError = new Error("Test error with cause", { cause: error });
const extendedError = Object.assign(new Error("Extended error"), {
	code: 500,
	info: { detail: "Additional info" },
});
const customError = new (class CustomError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = "CustomError";
	}
})("Custom error");
const aggregateError = new AggregateError(
	[error, nestedError, extendedError, customError],
	"Aggregate error",
);
const suppressedError = new SuppressedError(
	error,
	nestedError,
	"Suppressed error message",
);

describe("jsonMakeErrorReplacerFunction", () => {
	const replacer = jsonMakeErrorReplacerFunction();

	it("should serialize a simple error", () => {
		const result = JSON.parse(JSON.stringify(error, replacer)!);
		expect(result).toEqual({
			name: "Error",
			message: "Test error",
			stack: expect.stringContaining("Error: Test error"),
		});
	});

	it("should serialize an error with a cause", () => {
		const result = JSON.parse(JSON.stringify(nestedError, replacer)!);
		expect(result).toEqual({
			name: "Error",
			message: "Test error with cause",
			stack: expect.stringContaining("Error: Test error with cause"),
			cause: {
				name: "Error",
				message: "Test error",
				stack: expect.stringContaining("Error: Test error"),
			},
		});
	});

	it("should serialize an extended error with additional properties", () => {
		const result = JSON.parse(JSON.stringify(extendedError, replacer)!);
		expect(result).toEqual({
			name: "Error",
			message: "Extended error",
			stack: expect.stringContaining("Error: Extended error"),
			code: 500,
			info: { detail: "Additional info" },
		});
	});

	it("should serialize a custom error", () => {
		const result = JSON.parse(JSON.stringify(customError, replacer)!);
		expect(result).toEqual({
			name: "CustomError",
			message: "Custom error",
			stack: expect.stringContaining("CustomError: Custom error"),
		});
	});

	it("should serialize an AggregateError with multiple errors", () => {
		const result = JSON.parse(JSON.stringify(aggregateError, replacer)!);
		expect(result).toEqual({
			name: "AggregateError",
			message: "Aggregate error",
			stack: expect.stringContaining("AggregateError: Aggregate error"),
			errors: [
				{
					name: "Error",
					message: "Test error",
					stack: expect.stringContaining("Error: Test error"),
				},
				{
					name: "Error",
					message: "Test error with cause",
					stack: expect.stringContaining("Error: Test error with cause"),
					cause: {
						name: "Error",
						message: "Test error",
						stack: expect.stringContaining("Error: Test error"),
					},
				},
				{
					name: "Error",
					message: "Extended error",
					stack: expect.stringContaining("Error: Extended error"),
					code: 500,
					info: { detail: "Additional info" },
				},
				{
					name: "CustomError",
					message: "Custom error",
					stack: expect.stringContaining("CustomError: Custom error"),
				},
			],
		});
	});

	it("should serialize a SuppressedError", () => {
		const result = JSON.parse(JSON.stringify(suppressedError, replacer)!);
		expect(result).toEqual({
			name: "SuppressedError",
			message: "Suppressed error message",
			stack: expect.stringContaining(
				"SuppressedError: Suppressed error message",
			),
			error: {
				name: "Error",
				message: "Test error",
				stack: expect.stringContaining("Error: Test error"),
			},
			suppressed: {
				name: "Error",
				message: "Test error with cause",
				stack: expect.stringContaining("Error: Test error with cause"),
				cause: {
					name: "Error",
					message: "Test error",
					stack: expect.stringContaining("Error: Test error"),
				},
			},
		});
	});

	it("should serialize a SuppressedError with custom errors", () => {
		const customSuppressedError = new SuppressedError(
			customError,
			extendedError,
			"Custom suppressed",
		);
		const result = JSON.parse(JSON.stringify(customSuppressedError, replacer)!);
		expect(result).toEqual({
			name: "SuppressedError",
			message: "Custom suppressed",
			stack: expect.stringContaining("SuppressedError: Custom suppressed"),
			error: {
				name: "CustomError",
				message: "Custom error",
				stack: expect.stringContaining("CustomError: Custom error"),
			},
			suppressed: {
				name: "Error",
				message: "Extended error",
				stack: expect.stringContaining("Error: Extended error"),
				code: 500,
				info: { detail: "Additional info" },
			},
		});
	});
});
