import {
	ByteReader,
	bigIntFromBytesBe,
	bigIntToBytesBe,
	decodeText,
	encodeText,
	encodeTextUtf8,
} from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import {
	decodeLength,
	decodeTag,
	encodeDefiniteLength,
	encodeTag,
} from "./tag.js";
import { readAllTlv, readTlv, writeTlv } from "./tlv.js";
import {
	decodeGeneralizedTime,
	decodeOid,
	decodeRelativeOid,
	decodeUtcTime,
	encodeGeneralizedTime,
	encodeOid,
	encodeRelativeOid,
	encodeUtcTime,
} from "./values.js";

describe("Tag encoding", () => {
	it("encodes UNIVERSAL primitive tag numbers < 31 (short form)", () => {
		const tag = encodeTag({
			tagClass: "universal",
			tagNumber: 2,
			constructed: false,
		});
		expect(tag).toEqual(new Uint8Array([0x02])); // INTEGER
	});

	it("encodes UNIVERSAL constructed SEQUENCE (short form)", () => {
		const tag = encodeTag({
			tagClass: "universal",
			tagNumber: 16,
			constructed: true,
		});
		expect(tag).toEqual(new Uint8Array([0x30])); // SEQUENCE
	});

	it("encodes CONTEXT tag [0] EXPLICIT (short form)", () => {
		const tag = encodeTag({
			tagClass: "context",
			tagNumber: 0,
			constructed: true,
		});
		expect(tag).toEqual(new Uint8Array([0xa0]));
	});

	it("encodes CONTEXT tag [0] IMPLICIT primitive (short form)", () => {
		const tag = encodeTag({
			tagClass: "context",
			tagNumber: 0,
			constructed: false,
		});
		expect(tag).toEqual(new Uint8Array([0x80]));
	});

	it("encodes APPLICATION tag 5 (short form)", () => {
		const tag = encodeTag({
			tagClass: "application",
			tagNumber: 5,
			constructed: false,
		});
		expect(tag).toEqual(new Uint8Array([0x45]));
	});

	it("encodes long-form tag number 31", () => {
		const tag = encodeTag({
			tagClass: "universal",
			tagNumber: 31,
			constructed: false,
		});
		expect(tag).toEqual(new Uint8Array([0x1f, 0x1f]));
	});

	it("encodes long-form tag number 128", () => {
		const tag = encodeTag({
			tagClass: "universal",
			tagNumber: 128,
			constructed: false,
		});
		expect(tag).toEqual(new Uint8Array([0x1f, 0x81, 0x00]));
	});

	it("decodes UNIVERSAL INTEGER", () => {
		const r = new ByteReader(new Uint8Array([0x02]));
		const tag = decodeTag(r);
		expect(tag).toEqual({
			tagClass: "universal",
			tagNumber: 2,
			constructed: false,
		});
	});

	it("decodes UNIVERSAL SEQUENCE (constructed)", () => {
		const r = new ByteReader(new Uint8Array([0x30]));
		const tag = decodeTag(r);
		expect(tag).toEqual({
			tagClass: "universal",
			tagNumber: 16,
			constructed: true,
		});
	});

	it("round-trips long-form tag", () => {
		const original = {
			tagClass: "context" as const,
			tagNumber: 31,
			constructed: false,
		};
		const encoded = encodeTag(original);
		const decoded = decodeTag(new ByteReader(encoded));
		expect(decoded).toEqual(original);
	});
});

// ── Length encoding ───────────────────────────────────────────────────────────

describe("Length encoding", () => {
	it("encodes short-form length 0", () => {
		expect(encodeDefiniteLength(0)).toEqual(new Uint8Array([0x00]));
	});

	it("encodes short-form length 127", () => {
		expect(encodeDefiniteLength(127)).toEqual(new Uint8Array([0x7f]));
	});

	it("encodes long-form length 128 (1 byte)", () => {
		expect(encodeDefiniteLength(128)).toEqual(new Uint8Array([0x81, 0x80]));
	});

	it("encodes long-form length 256 (2 bytes)", () => {
		expect(encodeDefiniteLength(256)).toEqual(
			new Uint8Array([0x82, 0x01, 0x00]),
		);
	});

	it("decodes short-form length", () => {
		expect(decodeLength(new ByteReader(new Uint8Array([0x0a])))).toBe(10);
	});

	it("decodes indefinite length (returns undefined)", () => {
		expect(
			decodeLength(new ByteReader(new Uint8Array([0x80]))),
		).toBeUndefined();
	});

	it("decodes long-form length 128", () => {
		expect(decodeLength(new ByteReader(new Uint8Array([0x81, 0x80])))).toBe(
			128,
		);
	});
});

// ── TLV ───────────────────────────────────────────────────────────────────────

describe("TLV read/write", () => {
	it("writeTlv / readTlv round-trip", () => {
		const tag = {
			tagClass: "universal" as const,
			tagNumber: 2,
			constructed: false,
		};
		const contents = new Uint8Array([0x05]); // INTEGER 5
		const tlv = writeTlv(tag, contents);
		expect(tlv).toEqual(new Uint8Array([0x02, 0x01, 0x05]));
		const { tag: t, contents: c } = readTlv(new ByteReader(tlv));
		expect(t).toEqual(tag);
		expect(c).toEqual(contents);
	});

	it("readAllTlv parses multiple TLVs", () => {
		// SEQUENCE { INTEGER 5, NULL }
		const buf = new Uint8Array([0x02, 0x01, 0x05, 0x05, 0x00]);
		const items = readAllTlv(buf);
		expect(items).toHaveLength(2);
		expect(items[0]!.tag.tagNumber).toBe(2);
		expect(items[1]!.tag.tagNumber).toBe(5);
	});
});

// ── bigint ↔ bytes ────────────────────────────────────────────────────────────

describe("bigint encoding", () => {
	it("encodes 0", () => {
		expect(bigIntToBytesBe(0n)).toEqual(new Uint8Array([0x00]));
	});

	it("encodes 127 (no leading 0x00 needed)", () => {
		expect(bigIntToBytesBe(127n)).toEqual(new Uint8Array([0x7f]));
	});

	it("encodes 128 (needs leading 0x00)", () => {
		expect(bigIntToBytesBe(128n)).toEqual(new Uint8Array([0x00, 0x80]));
	});

	it("encodes -1 (two's complement)", () => {
		expect(bigIntToBytesBe(-1n)).toEqual(new Uint8Array([0xff]));
	});

	it("encodes -128", () => {
		expect(bigIntToBytesBe(-128n)).toEqual(new Uint8Array([0x80]));
	});

	it("encodes -129 (needs two bytes)", () => {
		expect(bigIntToBytesBe(-129n)).toEqual(new Uint8Array([0xff, 0x7f]));
	});

	it("round-trips arbitrary large values", () => {
		for (const n of [
			0n,
			1n,
			127n,
			128n,
			255n,
			256n,
			-1n,
			-128n,
			-129n,
			1000000n,
			-1000000n,
		]) {
			expect(bigIntFromBytesBe(bigIntToBytesBe(n))).toBe(n);
		}
	});
});

// ── OID ───────────────────────────────────────────────────────────────────────

describe("OID encoding", () => {
	// X.690 §8.19 example: 2.999.3 = {8, 0x83, 0x77, 0x03}
	it("encodes 1.2.840.113549 (RSA Data Security)", () => {
		const arcs = [1, 2, 840, 113549];
		const encoded = encodeOid(arcs);
		expect(decodeOid(encoded)).toEqual(arcs);
	});

	it("encodes 2.5.4.3 (commonName)", () => {
		const arcs = [2, 5, 4, 3];
		const encoded = encodeOid(arcs);
		// 2.5 → 85 (0x55), then 4, then 3
		expect(encoded[0]).toBe(0x55);
		expect(decodeOid(encoded)).toEqual(arcs);
	});

	it("round-trips sha256 OID", () => {
		const arcs = [2, 16, 840, 1, 101, 3, 4, 2, 1];
		expect(decodeOid(encodeOid(arcs))).toEqual(arcs);
	});

	it("round-trips RELATIVE-OID", () => {
		const arcs = [840, 113549, 1];
		expect(decodeRelativeOid(encodeRelativeOid(arcs))).toEqual(arcs);
	});
});

// ── Strings ───────────────────────────────────────────────────────────────────

describe("String encoding", () => {
	it("UTF-8 round-trips ASCII", () => {
		const s = "Hello, World!";
		expect(decodeText(encodeTextUtf8(s), "utf-8")).toBe(s);
	});

	it("UTF-8 round-trips Unicode", () => {
		const s = "café 中文 🎉";
		expect(decodeText(encodeTextUtf8(s), "utf-8")).toBe(s);
	});

	it("Latin-1 round-trips ASCII", () => {
		const s = "Hello";
		expect(decodeText(encodeText(s, "latin1"), "latin1")).toBe(s);
	});

	it("BMPString round-trips", () => {
		const s = "ABC";
		expect(decodeText(encodeText(s, "utf-16be"), "utf-16be")).toBe(s);
	});
});

// ── Time ─────────────────────────────────────────────────────────────────────

describe("Time encoding", () => {
	it("UTCTime encodes to YYMMDDHHMMSSZ", () => {
		const v = {
			year: 2024,
			month: 1,
			day: 15,
			hour: 10,
			minute: 30,
			second: 45,
			utcOffsetMinutes: 0,
		};
		const encoded = encodeUtcTime(v);
		expect(decodeText(encoded, "latin1")).toBe("240115103045Z");
	});

	it("UTCTime decodes from string", () => {
		const encoded = encodeText("240115103045Z", "latin1");
		const v = decodeUtcTime(encoded);
		expect(v.year).toBe(2024);
		expect(v.month).toBe(1);
		expect(v.day).toBe(15);
		expect(v.hour).toBe(10);
		expect(v.minute).toBe(30);
		expect(v.second).toBe(45);
	});

	it("GeneralizedTime round-trips", () => {
		const v = { year: 2024, month: 6, day: 1, hour: 12, minute: 0, second: 0 };
		const encoded = encodeGeneralizedTime(v);
		const decoded = decodeGeneralizedTime(encoded);
		expect(decoded.year).toBe(2024);
		expect(decoded.month).toBe(6);
	});

	it("UTCTime honors a non-zero utcOffsetMinutes on encode", () => {
		const v = {
			year: 2024,
			month: 1,
			day: 15,
			hour: 10,
			minute: 30,
			second: 45,
			utcOffsetMinutes: -330,
		};
		const encoded = encodeUtcTime(v);
		expect(decodeText(encoded, "latin1")).toBe("240115103045-0530");
	});

	it("UTCTime decodes a +HHMM offset suffix", () => {
		const encoded = encodeText("240115103045+0130", "latin1");
		const v = decodeUtcTime(encoded);
		expect(v.utcOffsetMinutes).toBe(90);
	});

	it("UTCTime decode/encode round-trips a negative offset", () => {
		const encoded = encodeText("240115103045-0530", "latin1");
		const decoded = decodeUtcTime(encoded);
		expect(decoded.utcOffsetMinutes).toBe(-330);
		expect(decodeText(encodeUtcTime(decoded), "latin1")).toBe(
			"240115103045-0530",
		);
	});

	it("GeneralizedTime encodes and decodes a fractional second", () => {
		const v = {
			year: 2024,
			month: 6,
			day: 1,
			hour: 12,
			minute: 0,
			second: 0,
			fraction: 0.5,
			utcOffsetMinutes: 0,
		};
		const encoded = encodeGeneralizedTime(v);
		expect(decodeText(encoded, "latin1")).toBe("20240601120000.5Z");
		const decoded = decodeGeneralizedTime(encoded);
		expect(decoded.fraction).toBe(0.5);
		expect(decoded.utcOffsetMinutes).toBe(0);
	});

	it("GeneralizedTime honors a non-zero utcOffsetMinutes", () => {
		const v = {
			year: 2024,
			month: 6,
			day: 1,
			hour: 12,
			minute: 0,
			second: 0,
			utcOffsetMinutes: 90,
		};
		const encoded = encodeGeneralizedTime(v);
		expect(decodeText(encoded, "latin1")).toBe("20240601120000+0130");
		expect(decodeGeneralizedTime(encoded).utcOffsetMinutes).toBe(90);
	});

	it("GeneralizedTime omits the suffix entirely for local time (no utcOffsetMinutes)", () => {
		const v = { year: 2024, month: 6, day: 1, hour: 12, minute: 0, second: 0 };
		const encoded = encodeGeneralizedTime(v);
		expect(decodeText(encoded, "latin1")).toBe("20240601120000");
		expect(decodeGeneralizedTime(encoded).utcOffsetMinutes).toBeUndefined();
	});
});
