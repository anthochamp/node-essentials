import { describe, expect, it } from "vitest";

import { diagToValue } from "./diag-to-value.js";
import { parseCborNotation } from "./parser.js";
import { printDataValue, printDiagNode } from "./printer.js";

describe("printDataValue", () => {
	const roundTrips = [
		"0",
		"-1",
		"1.5",
		"0.0",
		"-0.0",
		"Infinity",
		"-Infinity",
		'"IETF"',
		"h'01020304'",
		"[1, 2, 3]",
		"{1: 2, 3: 4}",
		'0("2013-03-21T20:04:00Z")',
		"true",
		"false",
		"null",
		"undefined",
		"simple(42)",
	];

	it.each(roundTrips)("round-trips %s", (source) => {
		expect(printDataValue(diagToValue(parseCborNotation(source)))).toBe(source);
	});

	it("disambiguates a whole-number float from an int with a decimal point", () => {
		expect(printDataValue({ kind: "float", value: 5 })).toBe("5.0");
	});

	it("prints NaN", () => {
		expect(printDataValue({ kind: "float", value: Number.NaN })).toBe("NaN");
	});
});

describe("printDiagNode", () => {
	it("preserves a comment on round-trip", () => {
		const source = "/count/ 5";
		expect(printDiagNode(parseCborNotation(source))).toBe(source);
	});

	it("preserves comments nested inside a structure", () => {
		const source = "[/first/ 1, /second/ 2]";
		expect(printDiagNode(parseCborNotation(source))).toBe(source);
	});

	it("has no comments to print for a plain DataValue-derived tree", () => {
		expect(printDiagNode(parseCborNotation("1"))).toBe("1");
	});
});
