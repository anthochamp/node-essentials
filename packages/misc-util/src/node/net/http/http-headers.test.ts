import { describe, expect, it } from "vitest";
import {
	httpFilterHeaders,
	httpGetHeaderValue,
	httpGetHeaderValues,
	httpNormalizeHeaders,
} from "./http-headers.js";

const headers = {
	Accept: ["value1", "value2"],
	"Content-Type": "application/json",
	"Content-Length": 12345,
};

describe("http-headers", () => {
	describe("httpGetHeaderValue", () => {
		it("should get an header value", () => {
			const value = httpGetHeaderValue(headers, "Accept");

			expect(value).toEqual(["value1", "value2"]);
		});

		it("should return undefined if header does not exist", () => {
			const value = httpGetHeaderValue(headers, "X-Unknown");

			expect(value).toBeUndefined();
		});
	});

	describe("httpGetHeaderValues", () => {
		it("should get an header values", () => {
			const values = httpGetHeaderValues(headers, "Accept");

			expect(values).toEqual(["value1", "value2"]);
		});

		it("should get a single header value as an array", () => {
			const values = httpGetHeaderValues(headers, "Content-Type");

			expect(values).toEqual(["application/json"]);
		});

		it("should return an empty array if header does not exist", () => {
			const values = httpGetHeaderValues(headers, "X-Unknown");

			expect(values).toEqual([]);
		});
	});

	describe("httpFilterHeaders", () => {
		it("should filter headers by a predicate", () => {
			const filtered = httpFilterHeaders(headers, (name, value) => {
				return name.toLowerCase() === "accept";
			});

			expect(filtered).toEqual({
				Accept: ["value1", "value2"],
			});
		});
	});

	describe("httpNormalizeHeaders", () => {
		it("should normalize headers", () => {
			const normalized = httpNormalizeHeaders(headers);

			expect(normalized).toEqual({
				Accept: ["value1", "value2"],
				"Content-Type": "application/json",
				"Content-Length": "12345",
			});
		});
	});
});
