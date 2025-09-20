import { afterEach, beforeEach, expect, suite, test } from "vitest";
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

suite("formatError", () => {
	let originalDefaultOptions: typeof formatError.defaultOptions;

	beforeEach(() => {
		originalDefaultOptions = { ...formatError.defaultOptions };
	});

	afterEach(() => {
		formatError.defaultOptions = originalDefaultOptions;
	});

	test.each([
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

	suite("options.prefix", () => {
		test("should add the specified prefix", () => {
			const formatted = formatError(simpleError, { prefix: "PREFIX" });
			expect(formatted).toBe("PREFIX: <Error> error message");
		});

		test("should use defaultOptions.prefix when not specified in options", () => {
			formatError.defaultOptions.prefix = "DEFAULT PREFIX";
			let formatted = formatError(simpleError);
			expect(formatted).toBe("DEFAULT PREFIX: <Error> error message");

			formatError.defaultOptions.prefix = "";
			formatted = formatError(simpleError);
			expect(formatted).toBe("<Error> error message");
		});
	});

	suite("options.skipCauses", () => {
		test("should include causes when false", () => {
			const formatted = formatError(nestedError, { skipCauses: false });
			expect(formatted).toBe(
				"<Error> top level error message: <Error> cause error message",
			);
		});

		test("should exclude causes when true", () => {
			const formatted = formatError(nestedError, { skipCauses: true });
			expect(formatted).toBe("<Error> top level error message");
		});

		test("should use defaultOptions.skipCauses when not specified in options", () => {
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

	suite("options.skipAggregateErrors", () => {
		test("should include aggregated errors when false", () => {
			const formatted = formatError(aggregateError, {
				skipAggregateErrors: false,
			});
			expect(formatted).toBe(
				"<AggregateError> Aggregate error message: (#1: <Error> Inner error 1 message, #2: <Error> Inner error 2 message)",
			);
		});

		test("should exclude aggregated errors when true", () => {
			const formatted = formatError(aggregateError, {
				skipAggregateErrors: true,
			});
			expect(formatted).toBe("<AggregateError> Aggregate error message");
		});

		test("should use defaultOptions.skipAggregateErrors when not specified in options", () => {
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

	suite("options.hideErrorName", () => {
		test("should include the error name when false", () => {
			const formatted = formatError(simpleError, { hideErrorName: false });
			expect(formatted).toBe("<Error> error message");
		});

		test("should exclude the error name when true", () => {
			const formatted = formatError(simpleError, { hideErrorName: true });
			expect(formatted).toBe("error message");
		});

		test("should use defaultOptions.hideErrorName when not specified in options", () => {
			formatError.defaultOptions.hideErrorName = true;
			let formatted = formatError(simpleError);
			expect(formatted).toBe("error message");

			formatError.defaultOptions.hideErrorName = false;
			formatted = formatError(simpleError);
			expect(formatted).toBe("<Error> error message");
		});
	});

	suite("options.stringifier", () => {
		test("should use custom stringifier function", () => {
			const formatted = formatError(new Date("2024-01-01"), {
				stringifier: (value) =>
					value instanceof Date
						? "PASS"
						: originalDefaultOptions.stringifier(value),
			});
			expect(formatted).toBe("PASS");
		});

		test("should use defaultOptions.stringifier when not specified in options", () => {
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

	suite("options.stackTrace", () => {
		test("should include stack trace when true", () => {
			const formatted = formatError(simpleError, { stackTrace: true });
			const lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: error message");
			expect(lines[1]?.trim().startsWith("at ")).toBe(true);
		});

		test("should exclude stack trace when false", () => {
			const formatted = formatError(simpleError, { stackTrace: false });
			expect(formatted).toBe("<Error> error message");
		});

		test("should include stack trace of only the first top-level error when 'top-level-only'", () => {
			const formatted = formatError(nestedError, {
				stackTrace: "top-level-only",
			});
			const lines = formatted.split("\n");
			expect(lines[0]).toBe(
				"<Error> top level error message: <Error> cause error message",
			);
			expect(lines[1]?.startsWith("  at ")).toBe(true);
			expect(lines.findIndex((v) => /^ {4}at /.test(v))).toBe(-1);
		});

		test("should include stack trace of all errors when true", () => {
			const formatted = formatError(nestedError, {
				stackTrace: true,
			});
			const lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: top level error message");
			expect(lines[1]?.startsWith("  at ")).toBe(true);
			expect(lines.findIndex((v) => /^ {4}at /.test(v))).not.toBe(-1);
		});

		test("should use defaultOptions.stackTrace when not specified in options", () => {
			formatError.defaultOptions.stackTrace = true;
			let formatted = formatError(simpleError);
			const lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: error message");
			expect(lines[1]?.trim().startsWith("at ")).toBe(true);

			formatError.defaultOptions.stackTrace = false;
			formatted = formatError(simpleError);
			expect(formatted).toBe("<Error> error message");
		});
	});

	suite("options.indentation", () => {
		test("should use custom indentation for stack trace lines", () => {
			const formatted = formatError(simpleError, {
				stackTrace: true,
				indentation: "-- ",
			});
			const lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: error message");
			expect(lines[1]?.startsWith("-- at ")).toBe(true);
		});

		test("should use defaultOptions.indentation when not specified in options", () => {
			formatError.defaultOptions.indentation = "-- ";
			let formatted = formatError(simpleError, { stackTrace: true });
			let lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: error message");
			expect(lines[1]?.startsWith("-- at ")).toBe(true);

			formatError.defaultOptions.indentation = "  ";
			formatted = formatError(simpleError, { stackTrace: true });
			lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: error message");
			expect(lines[1]?.startsWith("  at ")).toBe(true);
		});
	});

	suite("multi-line vs single-line output", () => {
		test("should produce single-line output when stackTrace is false", () => {
			const formatted = formatError(nestedError, { stackTrace: false });
			expect(formatted).toBe(
				"<Error> top level error message: <Error> cause error message",
			);
			expect(formatted.includes("\n")).toBe(false);
		});

		test("should produce multi-line output when stackTrace is true", () => {
			const formatted = formatError(nestedError, { stackTrace: true });
			expect(formatted.includes("\n")).toBe(true);
			const lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: top level error message");
			expect(lines[1]?.startsWith("  at ")).toBe(true);
			expect(lines.findIndex((v) => /^ {4}at /.test(v))).not.toBe(-1);
			expect(lines.includes("  Caused by: Error: cause error message")).toBe(
				true,
			);
		});

		test("should produce single-line output when stackTrace is 'top-level-only'", () => {
			const formatted = formatError(nestedError, {
				stackTrace: "top-level-only",
			});
			expect(formatted.includes("\n")).toBe(true);
			const lines = formatted.split("\n");
			expect(lines[0]).toBe(
				"<Error> top level error message: <Error> cause error message",
			);
			expect(lines[1]?.startsWith("  at ")).toBe(true);
			expect(lines.findIndex((v) => /^ {4}at /.test(v))).toBe(-1);
		});
	});

	suite("options.lineSeparator", () => {
		test("should use custom line separator for multi-line output", () => {
			const formatted = formatError(nestedError, {
				stackTrace: true,
				lineSeparator: "---",
			});
			expect(formatted.includes("---")).toBe(true);
			expect(formatted.includes("\n")).toBe(false);
			const lines = formatted.split("---");
			expect(lines[0]).toBe("Error: top level error message");
			expect(lines[1]?.startsWith("  at ")).toBe(true);
		});

		test("should use defaultOptions.lineSeparator when not specified in options", () => {
			formatError.defaultOptions.lineSeparator = "---";
			let formatted = formatError(nestedError, { stackTrace: true });
			expect(formatted.includes("---")).toBe(true);
			expect(formatted.includes("\n")).toBe(false);
			let lines = formatted.split("---");
			expect(lines[0]).toBe("Error: top level error message");
			expect(lines[1]?.startsWith("  at ")).toBe(true);

			formatError.defaultOptions.lineSeparator = "\n";
			formatted = formatError(nestedError, { stackTrace: true });
			expect(formatted.includes("\n")).toBe(true);
			expect(formatted.includes("\r\n")).toBe(false);
			lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: top level error message");
			expect(lines[1]?.startsWith("  at ")).toBe(true);
		});
	});

	test("should handle circular references in causes and aggregate errors", () => {
		const errorA = new Error("Error A");
		const errorB = new Error("Error B", { cause: errorA });
		errorA.cause = errorB; // Create circular reference

		const circularAggregateError = new AggregateError(
			[errorA, errorB],
			"Aggregate with circular causes",
		);
		circularAggregateError.errors.push(circularAggregateError); // Create circular reference in AggregateError

		const formatted = formatError(circularAggregateError, { stackTrace: true });
		const lines = formatted.split("\n");
		expect(lines[0]).toBe("AggregateError: Aggregate with circular causes");
		expect(lines[1]?.startsWith("  at ")).toBe(true);
		expect(lines.includes("      Caused by: Error: Error A [Circular]")).toBe(
			true,
		);
		expect(lines.includes("      Caused by: Error: Error B [Circular]")).toBe(
			true,
		);
	});

	suite("Complex error formatting", () => {
		test("should format a complex error with nested causes and aggregate errors", () => {
			const formatted = formatError(complexError, { stackTrace: true });
			const lines = formatted.split("\n");
			expect(lines[0]).toBe("Error: Complex error message");
			expect(lines[1]?.startsWith("  at ")).toBe(true);
			expect(
				lines.includes(
					"  Caused by: AggregateError: Aggregate error cause message",
				),
			).toBe(true);
		});

		test("should format a complex error with nested causes and aggregate errors in single-line mode", () => {
			const formatted = formatError(complexError, { stackTrace: false });
			expect(formatted).toBe(
				"<Error> Complex error message: <AggregateError> Aggregate error cause message: (#1: <Error> top level error message: <Error> cause error message, #2: <AggregateError> Aggregate error message: (#1: <Error> Inner error 1 message, #2: <Error> Inner error 2 message))",
			);
		});
	});
});
