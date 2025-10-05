import { expect, suite, test } from "vitest";
import {
	httpFieldFoldValues,
	httpFieldParseHttpComment,
	httpFieldParseQuotedString,
	httpFieldSplitValueByWs,
	httpFieldUnfoldValues,
} from "./http-field-value-util.js";

suite("httpFieldSplitValueByWs", () => {
	test("should split by whitespace", () => {
		expect(httpFieldSplitValueByWs("a b\tc  d")).toEqual(["a", "b", "c", "d"]);
	});
	test("should return empty array for empty string", () => {
		expect(httpFieldSplitValueByWs("")).toEqual([]);
	});
	test("should handle leading/trailing whitespace", () => {
		expect(httpFieldSplitValueByWs("  a b  ")).toEqual(["a", "b"]);
	});
});

suite("httpFieldParseQuotedString", () => {
	test("should parse simple quoted string", () => {
		expect(httpFieldParseQuotedString('"hello"')).toBe("hello");
	});
	test("should parse quoted string with escaped quotes", () => {
		expect(httpFieldParseQuotedString('"he\\"llo"')).toBe('he\\"llo');
	});
	test("should return null for non-quoted string", () => {
		expect(httpFieldParseQuotedString("hello")).toBeNull();
	});
	test("should parse quoted string with whitespace", () => {
		expect(httpFieldParseQuotedString('"hello world"')).toBe("hello world");
	});
});

suite("httpFieldUnfoldValues", () => {
	test("should return empty array for undefined or empty string", () => {
		expect(httpFieldUnfoldValues()).toEqual([]);
		expect(httpFieldUnfoldValues("")).toEqual([]);
	});

	test("should unfold simple comma-separated values", () => {
		expect(httpFieldUnfoldValues("value1, value2, value3")).toEqual([
			"value1",
			"value2",
			"value3",
		]);
	});

	test("should handle quoted strings", () => {
		expect(
			httpFieldUnfoldValues('value1, "value, with, commas", value3'),
		).toEqual(["value1", '"value, with, commas"', "value3"]);
	});

	test("should handle comments", () => {
		expect(httpFieldUnfoldValues("value1 (this is a comment), value2")).toEqual(
			["value1 (this is a comment)", "value2"],
		);
	});

	test("should handle nested comments", () => {
		expect(
			httpFieldUnfoldValues("value1 (comment (nested comment)), value2"),
		).toEqual(["value1 (comment (nested comment))", "value2"]);
	});

	test("should handle complex combinations", () => {
		expect(
			httpFieldUnfoldValues(
				'value1, "quoted, value" (with, a comment), value2 (another, (nested) comment), value3',
			),
		).toEqual([
			"value1",
			'"quoted, value" (with, a comment)',
			"value2 (another, (nested) comment)",
			"value3",
		]);
	});

	suite("real-world header field values", () => {
		test("Date header", () => {
			// RFC 9110 Section 5.6.6 example
			const value = "Tue, 15 Nov 1994 08:12:31 GMT";
			expect(httpFieldUnfoldValues(value)).toEqual([
				"Tue, 15 Nov 1994 08:12:31 GMT",
			]);
		});

		test("Date header with comment", () => {
			// RFC 9110 Section 5.6.6 example
			const value = "Tue, 15 Nov 1994 08:12:31 GMT (server local time)";
			expect(httpFieldUnfoldValues(value)).toEqual([
				"Tue, 15 Nov 1994 08:12:31 GMT (server local time)",
			]);
		});

		test("User-Agent header with comment", () => {
			const value = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
			expect(httpFieldUnfoldValues(value)).toEqual([
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
			]);
		});

		test("Via header with comment", () => {
			// RFC 9110 Section 7.6.3 example
			const value = "1.0 fred, 1.1 example.com (Apache/1.1)";
			expect(httpFieldUnfoldValues(value)).toEqual([
				"1.0 fred",
				"1.1 example.com (Apache/1.1)",
			]);
		});

		test("Warning header with quoted-string and comment", () => {
			// RFC 9110 Section 7.6.4 example
			const value = '199 example.com "Old warning text" (warned by proxy)';
			expect(httpFieldUnfoldValues(value)).toEqual([
				'199 example.com "Old warning text" (warned by proxy)',
			]);
		});
	});
});

suite("httpFieldFoldValues", () => {
	test("should fold values with default spacing", () => {
		const values = ["value1", "value2", "value3"];
		expect(httpFieldFoldValues(values)).toBe("value1, value2, value3");
	});

	test("should fold values with custom spacing", () => {
		const values = ["value1", "value2", "value3"];
		expect(httpFieldFoldValues(values, "\t")).toBe("value1,\tvalue2,\tvalue3");
	});

	test("should throw error for invalid spacing", () => {
		const values = ["value1", "value2"];
		expect(() => httpFieldFoldValues(values, "invalid")).toThrow(
			"Invalid spacing",
		);
	});
});

suite("httpFieldParseHttpComment", () => {
	test("should parse simple comments", () => {
		expect(httpFieldParseHttpComment("(this is, a comment)")).toBe(
			"this is, a comment",
		);
	});

	test("should parse nested comments", () => {
		expect(httpFieldParseHttpComment("(comment (nested comment))")).toBe(
			"comment (nested comment)",
		);
		expect(httpFieldParseHttpComment("(outer (inner (innermost)))")).toBe(
			"outer (inner (innermost))",
		);
	});

	test("should return null for invalid comments", () => {
		expect(httpFieldParseHttpComment("no comment")).toBeNull();
		expect(httpFieldParseHttpComment("(unclosed comment")).toBeNull();
		expect(httpFieldParseHttpComment("unopened comment)")).toBeNull();
	});
});
