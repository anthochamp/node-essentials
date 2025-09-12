import { describe, expect, it } from "vitest";
import { captureStackTrace } from "./capture-stack-trace.js";

describe("captureStackTrace", () => {
	it("should capture the stack trace of the caller", () => {
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

	it("should use the provided reference to determine where to start the stack trace", () => {
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
