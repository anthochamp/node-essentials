import { expect, suite, test } from "vitest";

import { formatErrorStack } from "./format-error-stack.js";

suite("formatErrorStack", () => {
	test("should format an error stack with default options", () => {
		const errorStack = {
			message: "MyError: An error occurred",
			stackTrace: [
				"at Object.<anonymous> (/path/to/file.js:10:15)",
				"at Module._compile (internal/modules/cjs/loader.js:999:30)",
				"at Module.load (internal/modules/cjs/loader.js:815:32)",
			],
		};
		const formatted = formatErrorStack(errorStack);
		expect(formatted).toEqual([
			"MyError: An error occurred",
			"  at Object.<anonymous> (/path/to/file.js:10:15)",
			"  at Module._compile (internal/modules/cjs/loader.js:999:30)",
			"  at Module.load (internal/modules/cjs/loader.js:815:32)",
		]);
	});

	test("should format an error stack with custom indentation", () => {
		const errorStack = {
			message: "MyError: An error occurred",
			stackTrace: [
				"at Object.<anonymous> (/path/to/file.js:10:15)",
				"at Module._compile (internal/modules/cjs/loader.js:999:30)",
				"at Module.load (internal/modules/cjs/loader.js:815:32)",
			],
		};
		const formatted = formatErrorStack(errorStack, { indentation: "-- " });
		expect(formatted).toEqual([
			"MyError: An error occurred",
			"-- at Object.<anonymous> (/path/to/file.js:10:15)",
			"-- at Module._compile (internal/modules/cjs/loader.js:999:30)",
			"-- at Module.load (internal/modules/cjs/loader.js:815:32)",
		]);
	});

	test("should format an error stack without the message line", () => {
		const errorStack = {
			message: "MyError: An error occurred",
			stackTrace: [
				"at Object.<anonymous> (/path/to/file.js:10:15)",
				"at Module._compile (internal/modules/cjs/loader.js:999:30)",
				"at Module.load (internal/modules/cjs/loader.js:815:32)",
			],
		};
		const formatted = formatErrorStack(errorStack, { skipMessage: true });
		expect(formatted).toEqual([
			"  at Object.<anonymous> (/path/to/file.js:10:15)",
			"  at Module._compile (internal/modules/cjs/loader.js:999:30)",
			"  at Module.load (internal/modules/cjs/loader.js:815:32)",
		]);
	});
});
