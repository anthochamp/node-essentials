import { expect, suite, test } from "vitest";

import { parseCsv } from "./parse-csv.js";
import { stringifyCsv } from "./stringify-csv.js";

suite("parseCsv", () => {
	test("parses a simple CRLF-terminated file", () => {
		expect(parseCsv("a,b\r\nc,d\r\n")).toEqual([
			["a", "b"],
			["c", "d"],
		]);
	});

	test("parses bare-LF line endings", () => {
		expect(parseCsv("a,b\nc,d")).toEqual([
			["a", "b"],
			["c", "d"],
		]);
	});

	test("parses a quoted field containing the delimiter", () => {
		expect(parseCsv('"a,b",c')).toEqual([["a,b", "c"]]);
	});

	test("un-doubles an embedded quote", () => {
		expect(parseCsv('"a""b"')).toEqual([['a"b']]);
	});

	test("parses a quoted field spanning multiple lines", () => {
		expect(parseCsv('"a\nb",c')).toEqual([["a\nb", "c"]]);
	});

	test("returns no rows for empty input", () => {
		expect(parseCsv("")).toEqual([]);
	});

	test("respects a custom delimiter", () => {
		expect(parseCsv("a;b", { delimiter: ";" })).toEqual([["a", "b"]]);
	});

	test("round-trips through stringifyCsv", () => {
		const rows = [
			["a", "b,c", 'd"e', "f\ng"],
			["1", "2", "3", "4"],
		];
		expect(parseCsv(stringifyCsv(rows))).toEqual(rows);
	});
});
