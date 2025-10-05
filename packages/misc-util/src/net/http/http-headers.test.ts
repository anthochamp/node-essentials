/** biome-ignore-all lint/style/noNonNullAssertion: tests */
import { expect, suite, test } from "vitest";
import { HttpHeaders } from "./http-headers.js";

suite("HttpHeaders", () => {
	test("should parse Last-Modified header", () => {
		const headers = new HttpHeaders({
			"last-modified": ["Wed, 21 Oct 2015 07:28:00 GMT"],
		});
		const lastModified = headers.lastModified;
		expect(lastModified).toBeInstanceOf(Date);
		expect(lastModified?.toUTCString()).toBe("Wed, 21 Oct 2015 07:28:00 GMT");
	});

	test("should throw for invalid Last-Modified header", () => {
		const headers = new HttpHeaders({
			"last-modified": ["invalid-date"],
		});
		expect(() => headers.lastModified).toThrow("Invalid Last-Modified header");
	});

	test("should return null if Last-Modified header is missing", () => {
		const headers = new HttpHeaders({});
		expect(headers.lastModified).toBeNull();
	});

	test("should parse Content-Length header", () => {
		const headers = new HttpHeaders({
			"content-length": ["123", "456"],
		});
		const contentLength = headers.contentLength;
		expect(contentLength).toBe(123);
	});

	test("should throw for invalid Content-Length header", () => {
		const headers = new HttpHeaders({
			"content-length": ["invalid", "456"],
		});
		expect(() => headers.contentLength).toThrow(
			"Invalid Content-Length header",
		);
	});

	test("should return null if Content-Length header is missing", () => {
		const headers = new HttpHeaders({});
		expect(headers.contentLength).toBeNull();
	});

	test("should parse Content-Type header", () => {
		const headers = new HttpHeaders({
			"content-type": ["text/html; charset=UTF-8", "application/json"],
		});
		const contentType = headers.contentType;
		expect(contentType).toHaveLength(2);
		expect(contentType![0]!.type).toBe("text/html");
		expect(contentType![0]!.parameters.charset).toBe("UTF-8");
		expect(contentType![1]!.type).toBe("application/json");
		expect(contentType![1]!.parameters).toEqual({});
	});

	test("should return null if Content-Type header is missing", () => {
		const headers = new HttpHeaders({});
		expect(headers.contentType).toBeNull();
	});

	test("should parse Content-Disposition header", () => {
		const headers = new HttpHeaders({
			"content-disposition": [
				'attachment; filename="example.txt"',
				"inline; filename*=UTF-8''%e2%82%ac%20rates.txt",
			],
		});
		const contentDisposition = headers.contentDisposition;
		expect(contentDisposition).toHaveLength(2);
		expect(contentDisposition![0]!.type).toBe("attachment");
		expect(contentDisposition![0]!.parameters.filename).toBe("example.txt");
		expect(contentDisposition![1]!.type).toBe("inline");
		expect(contentDisposition![1]!.parameters.filename).toBe("€ rates.txt");
	});

	test("should return null if Content-Disposition header is missing", () => {
		const headers = new HttpHeaders({});
		expect(headers.contentDisposition).toBeNull();
	});

	test("should parse Last-Modified header with IMF-fixdate", () => {
		const headers = new HttpHeaders({
			"last-modified": ["Sun, 06 Nov 1994 08:49:37 GMT"],
		});
		const lastModified = headers.lastModified;
		expect(lastModified).toBeInstanceOf(Date);
		expect(lastModified?.toUTCString()).toBe("Sun, 06 Nov 1994 08:49:37 GMT");
	});

	test("should parse Last-Modified header with RFC 850 format", () => {
		const headers = new HttpHeaders({
			"last-modified": ["Sunday, 06-Nov-94 08:49:37 GMT"],
		});
		const lastModified = headers.lastModified;
		expect(lastModified).toBeInstanceOf(Date);
		expect(lastModified?.toUTCString()).toBe("Sun, 06 Nov 1994 08:49:37 GMT");
	});

	// TODO: Enable this test when asctime format is supported (and required...)
	// TODO: for now it takes the local timezone into account which is not correct (?)
	test.skip("should parse Last-Modified header with asctime format", () => {
		const headers = new HttpHeaders({
			"last-modified": ["Sun Nov  6 08:49:37 1994"],
		});
		const lastModified = headers.lastModified;
		expect(lastModified).toBeInstanceOf(Date);
		expect(lastModified?.toUTCString()).toBe("Sun, 06 Nov 1994 08:49:37 GMT");
	});
});
