import { expect, suite, test } from "vitest";
import { captureV8StackTrace } from "./capture-v8-stack-trace.js";

suite("captureStackTrace", () => {
	test("should capture the stack trace of the caller", () => {
		function a() {
			return b();
		}
		function b() {
			return captureV8StackTrace();
		}
		const stack = a();
		expect(stack).toBeDefined();
		expect(stack[0]?.functionName).toBe("b");
		expect(stack[1]?.functionName).toBe("a");
	});

	test("should use the provided reference to determine where to start the stack trace", () => {
		function a() {
			return b();
		}
		function b() {
			return c();
		}
		function c() {
			return captureV8StackTrace({ reference: b });
		}
		const stack = a();
		expect(stack).toBeDefined();
		expect(stack[0]?.functionName).toBe("a");
	});
});
