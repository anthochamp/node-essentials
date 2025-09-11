import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatError } from "./format-error.js";

const simpleError = new Error("error message");
const nestedError = new Error("top level error message", {
	cause: new Error("cause error message"),
});
const aggregateError = new AggregateError(
	[new Error("Inner error 1 message"), new Error("Inner error 2 message")],
	"Aggregate error message",
);
const complexError = new Error("Complex error message", {
	cause: new AggregateError(
		[nestedError, aggregateError],
		"Aggregate error cause message",
	),
});
const customError = new (class CustomError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = "CustomError";
	}
})("Custom error message");

describe("formatError", () => {
	let originalDefaultOptions: typeof formatError.defaultOptions;

	beforeEach(() => {
		originalDefaultOptions = { ...formatError.defaultOptions };
	});

	afterEach(() => {
		formatError.defaultOptions = originalDefaultOptions;
	});

	it.each([
		{ error: simpleError, result: "<Error> error message" },
		{
			error: nestedError,
			result: "<Error> top level error message: <Error> cause error message",
		},
		{
			error: aggregateError,
			result:
				"<AggregateError> Aggregate error message: (#1: <Error> Inner error 1 message, #2: <Error> Inner error 2 message)",
		},
		{ error: customError, result: "<CustomError> Custom error message" },
		{ error: "A string error", result: "A string error" },
		{ error: 42, result: "42" },
		{ error: { foo: "bar" }, result: '{"foo":"bar"}' },
		{ error: null, result: "null" },
		{ error: undefined, result: "" },
	])(
		"should format correctly '$error' with default options",
		({ error, result }) => {
			const formatted = formatError(error);
			expect(formatted).toBe(result);
		},
	);

	describe("options.prefix", () => {
		it("should add the specified prefix", () => {
			const formatted = formatError(simpleError, { prefix: "PREFIX" });
			expect(formatted).toBe("PREFIX: <Error> error message");
		});

		it("should use defaultOptions.prefix when not specified in options", () => {
			formatError.defaultOptions.prefix = "DEFAULT PREFIX";
			let formatted = formatError(simpleError);
			expect(formatted).toBe("DEFAULT PREFIX: <Error> error message");

			formatError.defaultOptions.prefix = "";
			formatted = formatError(simpleError);
			expect(formatted).toBe("<Error> error message");
		});
	});

	describe("options.skipCauses", () => {
		it("should include causes when false", () => {
			const formatted = formatError(nestedError, { skipCauses: false });
			expect(formatted).toBe(
				"<Error> top level error message: <Error> cause error message",
			);
		});

		it("should exclude causes when true", () => {
			const formatted = formatError(nestedError, { skipCauses: true });
			expect(formatted).toBe("<Error> top level error message");
		});

		it("should use defaultOptions.skipCauses when not specified in options", () => {
			formatError.defaultOptions.skipCauses = true;
			let formatted = formatError(nestedError);
			expect(formatted).toBe("<Error> top level error message");

			formatError.defaultOptions.skipCauses = false;
			formatted = formatError(nestedError);
			expect(formatted).toBe(
				"<Error> top level error message: <Error> cause error message",
			);
		});
	});

	describe("options.skipAggregateErrors", () => {
		it("should include aggregated errors when false", () => {
			const formatted = formatError(aggregateError, {
				skipAggregateErrors: false,
			});
			expect(formatted).toBe(
				"<AggregateError> Aggregate error message: (#1: <Error> Inner error 1 message, #2: <Error> Inner error 2 message)",
			);
		});

		it("should exclude aggregated errors when true", () => {
			const formatted = formatError(aggregateError, {
				skipAggregateErrors: true,
			});
			expect(formatted).toBe("<AggregateError> Aggregate error message");
		});

		it("should use defaultOptions.skipAggregateErrors when not specified in options", () => {
			formatError.defaultOptions.skipAggregateErrors = true;
			let formatted = formatError(aggregateError);
			expect(formatted).toBe("<AggregateError> Aggregate error message");

			formatError.defaultOptions.skipAggregateErrors = false;
			formatted = formatError(aggregateError);
			expect(formatted).toBe(
				"<AggregateError> Aggregate error message: (#1: <Error> Inner error 1 message, #2: <Error> Inner error 2 message)",
			);
		});
	});

	describe("options.hideErrorName", () => {
		it("should include the error name when false", () => {
			const formatted = formatError(simpleError, { hideErrorName: false });
			expect(formatted).toBe("<Error> error message");
		});

		it("should exclude the error name when true", () => {
			const formatted = formatError(simpleError, { hideErrorName: true });
			expect(formatted).toBe("error message");
		});

		it("should use defaultOptions.hideErrorName when not specified in options", () => {
			formatError.defaultOptions.hideErrorName = true;
			let formatted = formatError(simpleError);
			expect(formatted).toBe("error message");

			formatError.defaultOptions.hideErrorName = false;
			formatted = formatError(simpleError);
			expect(formatted).toBe("<Error> error message");
		});
	});

	describe("options.stringifier", () => {
		it("should use custom stringifier function", () => {
			const formatted = formatError(new Date("2024-01-01"), {
				stringifier: (value) =>
					value instanceof Date
						? "PASS"
						: originalDefaultOptions.stringifier(value),
			});
			expect(formatted).toBe("PASS");
		});

		it("should use defaultOptions.stringifier when not specified in options", () => {
			formatError.defaultOptions.stringifier = (value) =>
				value instanceof Date
					? "PASS"
					: originalDefaultOptions.stringifier(value);

			let formatted = formatError(new Date("2024-01-01"));
			expect(formatted).toBe("PASS");

			formatError.defaultOptions.stringifier =
				originalDefaultOptions.stringifier;
			formatted = formatError(new Date("2024-01-01"));
			expect(formatted).toBe('"2024-01-01T00:00:00.000Z"');
		});
	});

	describe("options.stackTrace", () => {
		it("should include stack trace when true", () => {
			const formatted = formatError(simpleError, { stackTrace: true });
			const lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: error message");
			expect(lines[1]?.trim().startsWith("at ")).toBe(true);
		});

		it("should exclude stack trace when false", () => {
			const formatted = formatError(simpleError, { stackTrace: false });
			expect(formatted).toBe("<Error> error message");
		});

		it("should include stack trace of only the first top-level error when 'top-level-only'", () => {
			const formatted = formatError(nestedError, {
				stackTrace: "top-level-only",
			});
			const lines = formatted.split("\n");
			expect(lines[0]).toBe(
				"<Error> top level error message: <Error> cause error message",
			);
			expect(lines.length).toBeGreaterThan(1);
			expect(lines[1].startsWith("  at ")).toBe(true);
			expect(lines.findIndex((v) => /^ {4}at /.test(v))).toBe(-1);
		});

		it("should include stack trace of all errors when true", () => {
			const formatted = formatError(nestedError, {
				stackTrace: true,
			});
			const lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: top level error message");
			expect(lines.length).toBeGreaterThan(1);
			expect(lines[1].startsWith("  at ")).toBe(true);
			expect(lines.findIndex((v) => /^ {4}at /.test(v))).not.toBe(-1);
		});

		it("should use defaultOptions.stackTrace when not specified in options", () => {
			formatError.defaultOptions.stackTrace = true;
			let formatted = formatError(simpleError);
			const lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: error message");
			expect(lines.length).toBeGreaterThan(1);
			expect(lines[1].trim().startsWith("at ")).toBe(true);

			formatError.defaultOptions.stackTrace = false;
			formatted = formatError(simpleError);
			expect(formatted).toBe("<Error> error message");
		});
	});

	describe("options.indentation", () => {
		it("should use custom indentation for stack trace lines", () => {
			const formatted = formatError(simpleError, {
				stackTrace: true,
				indentation: "-- ",
			});
			const lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: error message");
			expect(lines.length).toBeGreaterThan(1);
			expect(lines[1].startsWith("-- at ")).toBe(true);
		});

		it("should use defaultOptions.indentation when not specified in options", () => {
			formatError.defaultOptions.indentation = "-- ";
			let formatted = formatError(simpleError, { stackTrace: true });
			let lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: error message");
			expect(lines.length).toBeGreaterThan(1);
			expect(lines[1].startsWith("-- at ")).toBe(true);

			formatError.defaultOptions.indentation = "  ";
			formatted = formatError(simpleError, { stackTrace: true });
			lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: error message");
			expect(lines.length).toBeGreaterThan(1);
			expect(lines[1].startsWith("  at ")).toBe(true);
		});
	});

	describe("multi-line vs single-line output", () => {
		it("should produce single-line output when stackTrace is false", () => {
			const formatted = formatError(nestedError, { stackTrace: false });
			expect(formatted).toBe(
				"<Error> top level error message: <Error> cause error message",
			);
			expect(formatted.includes("\n")).toBe(false);
		});

		it("should produce multi-line output when stackTrace is true", () => {
			const formatted = formatError(nestedError, { stackTrace: true });
			expect(formatted.includes("\n")).toBe(true);
			const lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: top level error message");
			expect(lines[1].startsWith("  at ")).toBe(true);
			expect(lines.findIndex((v) => /^ {4}at /.test(v))).not.toBe(-1);
			expect(lines.includes("  Caused by: Error: cause error message")).toBe(
				true,
			);
		});

		it("should produce single-line output when stackTrace is 'top-level-only'", () => {
			const formatted = formatError(nestedError, {
				stackTrace: "top-level-only",
			});
			expect(formatted.includes("\n")).toBe(true);
			const lines = formatted.split("\n");
			expect(lines[0]).toBe(
				"<Error> top level error message: <Error> cause error message",
			);
			expect(lines[1].startsWith("  at ")).toBe(true);
			expect(lines.findIndex((v) => /^ {4}at /.test(v))).toBe(-1);
		});
	});

	describe("options.lineSeparator", () => {
		it("should use custom line separator for multi-line output", () => {
			const formatted = formatError(nestedError, {
				stackTrace: true,
				lineSeparator: "---",
			});
			expect(formatted.includes("---")).toBe(true);
			expect(formatted.includes("\n")).toBe(false);
			const lines = formatted.split("---");
			expect(lines[0]).toBe("Error: top level error message");
			expect(lines[1].startsWith("  at ")).toBe(true);
		});

		it("should use defaultOptions.lineSeparator when not specified in options", () => {
			formatError.defaultOptions.lineSeparator = "---";
			let formatted = formatError(nestedError, { stackTrace: true });
			expect(formatted.includes("---")).toBe(true);
			expect(formatted.includes("\n")).toBe(false);
			let lines = formatted.split("---");
			expect(lines[0]).toBe("Error: top level error message");
			expect(lines[1].startsWith("  at ")).toBe(true);

			formatError.defaultOptions.lineSeparator = "\n";
			formatted = formatError(nestedError, { stackTrace: true });
			expect(formatted.includes("\n")).toBe(true);
			expect(formatted.includes("\r\n")).toBe(false);
			lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: top level error message");
			expect(lines[1].startsWith("  at ")).toBe(true);
		});
	});

	it("should handle circular references in causes and aggregate errors", () => {
		const errorA = new Error("Error A");
		const errorB = new Error("Error B", { cause: errorA });
		errorA.cause = errorB; // Create circular reference

		const aggregateError = new AggregateError(
			[errorA, errorB],
			"Aggregate with circular causes",
		);
		aggregateError.errors.push(aggregateError); // Create circular reference in AggregateError

		const formatted = formatError(aggregateError, { stackTrace: true });
		const lines = formatted.split("\n");
		expect(lines[0]).toBe("AggregateError: Aggregate with circular causes");
		expect(lines.length).toBeGreaterThan(1);
		expect(lines[1].startsWith("  at ")).toBe(true);
		expect(lines.includes("      Caused by: Error: Error A [Circular]")).toBe(
			true,
		);
		expect(lines.includes("      Caused by: Error: Error B [Circular]")).toBe(
			true,
		);
	});

	describe("Complex error formatting", () => {
		it("should format a complex error with nested causes and aggregate errors", () => {
			const formatted = formatError(complexError, { stackTrace: true });
			const lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: Complex error message");
			expect(lines[1].startsWith("  at ")).toBe(true);
			expect(
				lines.includes(
					"  Caused by: AggregateError: Aggregate error cause message",
				),
			).toBe(true);
		});

		it("should format a complex error with nested causes and aggregate errors in single-line mode", () => {
			const formatted = formatError(complexError, { stackTrace: false });
			expect(formatted).toBe(
				"<Error> Complex error message: <AggregateError> Aggregate error cause message: (#1: <Error> top level error message: <Error> cause error message, #2: <AggregateError> Aggregate error message: (#1: <Error> Inner error 1 message, #2: <Error> Inner error 2 message))",
			);
		});
	});
});
