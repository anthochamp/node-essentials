import { describe, expect, it } from "vitest";
import { httpIsRedirectStatus } from "./is-redirect-status.js";
import { HttpStatusCode } from "./types.js";

describe("httpIsRedirectStatus", () => {
	describe("redirect status codes", () => {
		it("should return true for 301 Moved Permanently", () => {
			expect(httpIsRedirectStatus(HttpStatusCode.MOVED_PERMANENTLY)).toBe(true);
			expect(httpIsRedirectStatus(301)).toBe(true);
		});

		it("should return true for 302 Found", () => {
			expect(httpIsRedirectStatus(HttpStatusCode.FOUND)).toBe(true);
			expect(httpIsRedirectStatus(302)).toBe(true);
		});

		it("should return true for 303 See Other", () => {
			expect(httpIsRedirectStatus(HttpStatusCode.SEE_OTHER)).toBe(true);
			expect(httpIsRedirectStatus(303)).toBe(true);
		});

		it("should return true for 307 Temporary Redirect", () => {
			expect(httpIsRedirectStatus(HttpStatusCode.TEMPORARY_REDIRECT)).toBe(
				true,
			);
			expect(httpIsRedirectStatus(307)).toBe(true);
		});

		it("should return true for 308 Permanent Redirect", () => {
			expect(httpIsRedirectStatus(HttpStatusCode.PERMANENT_REDIRECT)).toBe(
				true,
			);
			expect(httpIsRedirectStatus(308)).toBe(true);
		});
	});

	describe("non-redirect status codes", () => {
		it("should return false for 2xx success codes", () => {
			expect(httpIsRedirectStatus(HttpStatusCode.OK)).toBe(false);
			expect(httpIsRedirectStatus(HttpStatusCode.CREATED)).toBe(false);
			expect(httpIsRedirectStatus(HttpStatusCode.NO_CONTENT)).toBe(false);
		});

		it("should return false for 4xx client error codes", () => {
			expect(httpIsRedirectStatus(HttpStatusCode.BAD_REQUEST)).toBe(false);
			expect(httpIsRedirectStatus(HttpStatusCode.NOT_FOUND)).toBe(false);
			expect(httpIsRedirectStatus(HttpStatusCode.UNAUTHORIZED)).toBe(false);
		});

		it("should return false for 5xx server error codes", () => {
			expect(httpIsRedirectStatus(HttpStatusCode.INTERNAL_SERVER_ERROR)).toBe(
				false,
			);
			expect(httpIsRedirectStatus(502)).toBe(false); // Bad Gateway
			expect(httpIsRedirectStatus(HttpStatusCode.SERVICE_UNAVAILABLE)).toBe(
				false,
			);
		});

		it("should return false for 1xx informational codes", () => {
			expect(httpIsRedirectStatus(100)).toBe(false); // Continue
			expect(httpIsRedirectStatus(101)).toBe(false); // Switching Protocols
		});

		it("should return false for other 3xx codes not in the redirect list", () => {
			expect(httpIsRedirectStatus(HttpStatusCode.NOT_MODIFIED)).toBe(false); // 304
			expect(httpIsRedirectStatus(300)).toBe(false); // Multiple Choices
			expect(httpIsRedirectStatus(305)).toBe(false); // Use Proxy (deprecated)
			expect(httpIsRedirectStatus(306)).toBe(false); // Switch Proxy (unused)
		});

		it("should return false for invalid status codes", () => {
			expect(httpIsRedirectStatus(0)).toBe(false);
			expect(httpIsRedirectStatus(999)).toBe(false);
			expect(httpIsRedirectStatus(-1)).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("should handle numeric values", () => {
			expect(httpIsRedirectStatus(301.5)).toBe(false); // Not an integer
			expect(httpIsRedirectStatus(Number.NaN)).toBe(false);
			expect(httpIsRedirectStatus(Number.POSITIVE_INFINITY)).toBe(false);
		});
	});
});
