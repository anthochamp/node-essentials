import { describe, expect, it } from "vitest";
import { captureV8StackTrace } from "./capture-v8-stack-trace.js";

describe("captureStackTrace", () => {
	it("should capture the stack trace of the caller", () => {
		function a() {
			return b();
		}
		function b() {
			return captureV8StackTrace();
		}
		const stack = a();
		expect(stack).toBeDefined();
		expect(stack[0].functionName).toBe("b");
		expect(stack[1].functionName).toBe("a");
	});

	it("should use the provided reference to determine where to start the stack trace", () => {
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
		expect(stack[0].functionName).toBe("a");
	});
});
