import { describe, expect, it } from "vitest";

import { decodeText } from "./decode-text.js";
import { encodeText, encodeTextUtf8 } from "./encode-text.js";

describe("encodeText/decodeText — utf-8", () => {
	it("should round-trip ASCII", () => {
		expect(decodeText(encodeTextUtf8("Hello"), "utf-8")).toBe("Hello");
	});

	it("should round-trip Unicode", () => {
		const s = "café 中文 🎉";
		expect(decodeText(encodeTextUtf8(s), "utf-8")).toBe(s);
	});

	it("should substitute U+FFFD for invalid bytes by default", () => {
		expect(decodeText(new Uint8Array([0xff]), "utf-8")).toBe("\ufffd");
	});

	it("should throw a TypeError for invalid bytes when fatal is true", () => {
		expect(() =>
			decodeText(new Uint8Array([0xff]), "utf-8", { fatal: true }),
		).toThrow(TypeError);
	});

	it("should drop a leading BOM by default", () => {
		const withBom = new Uint8Array([0xef, 0xbb, 0xbf, 0x41]);
		expect(decodeText(withBom, "utf-8")).toBe("A");
	});

	it("should keep a leading BOM when ignoreBOM is true", () => {
		const withBom = new Uint8Array([0xef, 0xbb, 0xbf, 0x41]);
		expect(decodeText(withBom, "utf-8", { ignoreBOM: true })).toBe("\ufeffA");
	});
});

describe("encodeText/decodeText — latin1", () => {
	it("should round-trip ASCII", () => {
		expect(decodeText(encodeText("Hello", "latin1"), "latin1")).toBe("Hello");
	});

	it("should keep the high bit", () => {
		expect(Array.from(encodeText("\u00e9", "latin1"))).toEqual([0xe9]);
	});

	it("should decode 1:1, ignoring fatal/ignoreBOM (not the windows-1252 WHATWG label)", () => {
		expect(decodeText(new Uint8Array([0x80]), "latin1", { fatal: true })).toBe(
			"\u0080",
		);
	});
});

describe("encodeText/decodeText — ascii", () => {
	it("should mask the high bit", () => {
		expect(Array.from(encodeText("\u00e9", "ascii"))).toEqual([0x69]);
	});
});

describe("encodeText/decodeText — utf-16be", () => {
	it("should round-trip a BMP string", () => {
		expect(decodeText(encodeText("ABC", "utf-16be"), "utf-16be")).toBe("ABC");
	});

	it("should encode big-endian, two bytes per code unit", () => {
		expect(Array.from(encodeText("A", "utf-16be"))).toEqual([0x00, 0x41]);
	});

	it("should throw a TypeError for a truncated trailing code unit when fatal", () => {
		expect(() =>
			decodeText(new Uint8Array([0x00]), "utf-16be", { fatal: true }),
		).toThrow(TypeError);
	});
});

describe("encodeText/decodeText — utf-32be", () => {
	it("should round-trip, including a supplementary-plane code point", () => {
		const s = "A🎉";
		expect(decodeText(encodeText(s, "utf-32be"), "utf-32be")).toBe(s);
	});

	it("should encode big-endian, four bytes per code point", () => {
		expect(Array.from(encodeText("A", "utf-32be"))).toEqual([
			0x00, 0x00, 0x00, 0x41,
		]);
	});

	it("should substitute U+FFFD for an out-of-range code point by default", () => {
		const outOfRange = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
		expect(decodeText(outOfRange, "utf-32be")).toBe("\ufffd");
	});

	it("should throw a TypeError for an out-of-range code point when fatal", () => {
		const outOfRange = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
		expect(() => decodeText(outOfRange, "utf-32be", { fatal: true })).toThrow(
			TypeError,
		);
	});
});
