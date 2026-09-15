import { describe, expect, it } from "vitest";

import { CborNotationParseError, parseCborNotation } from "./parser.js";

describe("parseCborNotation", () => {
	it("parses integers and floats", () => {
		expect(parseCborNotation("42")).toMatchObject({ kind: "int", value: 42n });
		expect(parseCborNotation("-7")).toMatchObject({ kind: "int", value: -7n });
		expect(parseCborNotation("1.5")).toMatchObject({
			kind: "float",
			value: 1.5,
		});
		expect(parseCborNotation("1e3")).toMatchObject({
			kind: "float",
			value: 1000,
		});
	});

	it("parses named literals", () => {
		expect(parseCborNotation("true")).toMatchObject({
			kind: "bool",
			value: true,
		});
		expect(parseCborNotation("false")).toMatchObject({
			kind: "bool",
			value: false,
		});
		expect(parseCborNotation("null")).toMatchObject({ kind: "null" });
		expect(parseCborNotation("undefined")).toMatchObject({ kind: "undefined" });
		expect(parseCborNotation("Infinity")).toMatchObject({
			kind: "float",
			value: Infinity,
		});
		expect(parseCborNotation("-Infinity")).toMatchObject({
			kind: "float",
			value: -Infinity,
		});
		const nan = parseCborNotation("NaN");
		expect(nan.kind).toBe("float");
		expect(Number.isNaN((nan as { value: number }).value)).toBe(true);
	});

	it("parses a text string", () => {
		expect(parseCborNotation('"IETF"')).toMatchObject({
			kind: "text",
			value: "IETF",
		});
	});

	it("parses hex and base64 byte strings", () => {
		expect(parseCborNotation("h'01020304'")).toMatchObject({
			kind: "bytes",
			value: Uint8Array.fromHex("01020304"),
		});
		expect(parseCborNotation("b64'aGVsbG8'")).toMatchObject({
			kind: "bytes",
			value: new TextEncoder().encode("hello"),
		});
	});

	it("parses an array, allowing a trailing comma", () => {
		expect(parseCborNotation("[1, 2, 3]")).toMatchObject({
			kind: "array",
			items: [
				{ kind: "int", value: 1n },
				{ kind: "int", value: 2n },
				{ kind: "int", value: 3n },
			],
		});
		expect(parseCborNotation("[1, 2,]")).toMatchObject({
			kind: "array",
			items: [
				{ kind: "int", value: 1n },
				{ kind: "int", value: 2n },
			],
		});
	});

	it("parses a map with non-string keys", () => {
		expect(parseCborNotation("{1: 2, 3: 4}")).toMatchObject({
			kind: "map",
			entries: [
				[
					{ kind: "int", value: 1n },
					{ kind: "int", value: 2n },
				],
				[
					{ kind: "int", value: 3n },
					{ kind: "int", value: 4n },
				],
			],
		});
	});

	it("parses a tag", () => {
		expect(parseCborNotation('0("2013-03-21T20:04:00Z")')).toMatchObject({
			kind: "tag",
			tag: 0n,
			value: { kind: "text", value: "2013-03-21T20:04:00Z" },
		});
	});

	it("parses a simple value", () => {
		expect(parseCborNotation("simple(42)")).toMatchObject({
			kind: "simple",
			value: 42,
		});
	});

	it("attaches a comment to the node it precedes", () => {
		const node = parseCborNotation("/count/ 5");
		expect(node.leadingComments).toEqual(["count"]);
	});

	it("throws CborNotationParseError on an unknown identifier", () => {
		expect(() => parseCborNotation("maybe")).toThrow(CborNotationParseError);
	});

	it("throws CborNotationParseError on trailing input", () => {
		expect(() => parseCborNotation("1 2")).toThrow(CborNotationParseError);
	});

	it("throws CborNotationParseError on an unclosed array", () => {
		expect(() => parseCborNotation("[1, 2")).toThrow(CborNotationParseError);
	});
});
