import { expect, suite, test } from "vitest";
import { captureStackTrace } from "./capture-stack-trace.js";

suite("captureStackTrace", () => {
	test("should capture the stack trace of the caller", () => {
		function a() {
			return b();
		}
		function b() {
			return captureStackTrace();
		}
		const stack = a();
		expect(stack).toBeDefined();
		expect(stack?.[0]).toMatch(/at b /);
		expect(stack?.[1]).toMatch(/at a /);
	});

	test("should use the provided reference to determine where to start the stack trace", () => {
		function a() {
			return b();
		}
		function b() {
			return c();
		}
		function c() {
			return captureStackTrace({ reference: b });
		}
		const stack = a();
		expect(stack).toBeDefined();
		expect(stack?.[0]).toMatch(/at a /);
	});
});
