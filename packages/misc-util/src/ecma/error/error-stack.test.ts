import { describe, expect, it } from "vitest";
import { formatErrorStack, parseErrorStack } from "./error-stack.js";

describe("ErrorStack", () => {
	describe("parseErrorStack", () => {
		it("should return undefined for errors without stack", () => {
			expect(
				parseErrorStack({
					name: "MyError",
					message: "An error occurred",
				}),
			).toBeUndefined();
		});

		it("should parse a simple error stack", () => {
			const error = {
				name: "MyError",
				message: "An error occurred",
				stack: `MyError: An error occurred
		at Object.<anonymous> (/path/to/file.js:10:15)
		at Module._compile (internal/modules/cjs/loader.js:999:30)
		at Module.load (internal/modules/cjs/loader.js:815:32)`,
			};
			const parsed = parseErrorStack(error);
			expect(parsed).toBeDefined();
			expect(parsed?.message).toBe("MyError: An error occurred");
			expect(parsed?.stackTrace).toEqual([
				"at Object.<anonymous> (/path/to/file.js:10:15)",
				"at Module._compile (internal/modules/cjs/loader.js:999:30)",
				"at Module.load (internal/modules/cjs/loader.js:815:32)",
			]);
		});
	});

	describe("formatErrorStack", () => {
		it("should format an error stack with default options", () => {
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

		it("should format an error stack with custom indentation", () => {
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
	});

	it("should format an error stack without the message line", () => {
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
