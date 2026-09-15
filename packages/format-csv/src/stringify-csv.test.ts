import { expect, suite, test } from "vitest";

import { stringifyCsv } from "./stringify-csv.js";

suite("stringifyCsv", () => {
	test("joins fields with a comma and rows with CRLF by default", () => {
		expect(
			stringifyCsv([
				["a", "b"],
				["c", "d"],
			]),
		).toBe("a,b\r\nc,d");
	});

	test("renders null as an empty field", () => {
		expect(stringifyCsv([["a", null]])).toBe("a,");
	});

	test("quotes a field containing the delimiter", () => {
		expect(stringifyCsv([["a,b", "c"]])).toBe('"a,b",c');
	});

	test("quotes and doubles an embedded quote", () => {
		expect(stringifyCsv([['a"b']])).toBe('"a""b"');
	});

	test("quotes a field containing a newline", () => {
		expect(stringifyCsv([["a\nb"]])).toBe('"a\nb"');
	});

	test("respects a custom delimiter", () => {
		expect(stringifyCsv([["a", "b"]], { delimiter: ";" })).toBe("a;b");
	});

	test("respects a custom newline", () => {
		expect(stringifyCsv([["a"], ["b"]], { newline: "\n" })).toBe("a\nb");
	});
});
