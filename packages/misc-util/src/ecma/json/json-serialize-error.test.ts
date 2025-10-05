import { expect, suite, test } from "vitest";
import { jsonSerializeError } from "./json-serialize-error.js";

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

suite("jsonSerializeError", () => {
	test("should serialize a simple error", () => {
		const serialized = jsonSerializeError(error);
		expect(serialized).toEqual({
			name: "Error",
			message: "Test error",
			stack: expect.stringContaining("Error: Test error"),
		});
	});

	test("should serialize an error with a cause", () => {
		const serialized = jsonSerializeError(nestedError);
		expect(serialized).toEqual({
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
	test("should serialize an extended error with additional properties", () => {
		const serialized = jsonSerializeError(extendedError);
		expect(serialized).toEqual({
			name: "Error",
			message: "Extended error",
			stack: expect.stringContaining("Error: Extended error"),
			code: 500,
			info: { detail: "Additional info" },
		});
	});

	test("should serialize a custom error", () => {
		const serialized = jsonSerializeError(customError);
		expect(serialized).toEqual({
			name: "CustomError",
			message: "Custom error",
			stack: expect.stringContaining("CustomError: Custom error"),
		});
	});

	test("should serialize an AggregateError with multiple errors", () => {
		const serialized = jsonSerializeError(aggregateError);
		expect(serialized).toEqual({
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

	test("should serialize a SuppressedError", () => {
		const serialized = jsonSerializeError(suppressedError);
		expect(serialized).toEqual({
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

	test("should serialize a SuppressedError with custom errors", () => {
		const customSuppressedError = new SuppressedError(
			customError,
			extendedError,
			"Custom suppressed",
		);
		const serialized = jsonSerializeError(customSuppressedError);
		expect(serialized).toEqual({
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
