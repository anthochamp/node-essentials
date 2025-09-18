import { expect, suite, test } from "vitest";
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

suite("http-headers", () => {
	suite("httpGetHeaderValue", () => {
		test("should get an header value", () => {
			const value = httpGetHeaderValue(headers, "Accept");

			expect(value).toEqual(["value1", "value2"]);
		});

		test("should return undefined if header does not exist", () => {
			const value = httpGetHeaderValue(headers, "X-Unknown");

			expect(value).toBeUndefined();
		});
	});

	suite("httpGetHeaderValues", () => {
		test("should get an header values", () => {
			const values = httpGetHeaderValues(headers, "Accept");

			expect(values).toEqual(["value1", "value2"]);
		});

		test("should get a single header value as an array", () => {
			const values = httpGetHeaderValues(headers, "Content-Type");

			expect(values).toEqual(["application/json"]);
		});

		test("should return an empty array if header does not exist", () => {
			const values = httpGetHeaderValues(headers, "X-Unknown");

			expect(values).toEqual([]);
		});
	});

	suite("httpFilterHeaders", () => {
		test("should filter headers by a predicate", () => {
			const filtered = httpFilterHeaders(headers, (name, _value) => {
				return name.toLowerCase() === "accept";
			});

			expect(filtered).toEqual({
				Accept: ["value1", "value2"],
			});
		});
	});

	suite("httpNormalizeHeaders", () => {
		test("should normalize headers", () => {
			const normalized = httpNormalizeHeaders(headers);

			expect(normalized).toEqual({
				Accept: ["value1", "value2"],
				"Content-Type": "application/json",
				"Content-Length": "12345",
			});
		});
	});
});
