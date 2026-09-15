import { ByteAccumulator } from "@ac-kit/core";
import { decodeAll, DecodeStream } from "@ac-kit/format-core";
import { describe, expect, it } from "vitest";

import type { DataValue } from "../ast.js";
import { CborDecodeError } from "../errors.js";
import { CborItemDecoder, decodeCbor, decodeCborItem } from "./decoder.js";

function bytes(hex: string): Uint8Array {
	return Uint8Array.fromHex(hex);
}

describe("decodeCbor", () => {
	it("decodes unsigned integers (RFC 8949 Appendix A)", () => {
		expect(decodeCbor(bytes("00"))).toEqual({ kind: "int", value: 0n });
		expect(decodeCbor(bytes("17"))).toEqual({ kind: "int", value: 23n });
		expect(decodeCbor(bytes("1818"))).toEqual({ kind: "int", value: 24n });
		expect(decodeCbor(bytes("1903e8"))).toEqual({ kind: "int", value: 1000n });
		expect(decodeCbor(bytes("1b000000e8d4a51000"))).toEqual({
			kind: "int",
			value: 1000000000000n,
		});
		expect(decodeCbor(bytes("1bffffffffffffffff"))).toEqual({
			kind: "int",
			value: 18446744073709551615n,
		});
	});

	it("decodes negative integers (RFC 8949 Appendix A)", () => {
		expect(decodeCbor(bytes("20"))).toEqual({ kind: "int", value: -1n });
		expect(decodeCbor(bytes("3863"))).toEqual({ kind: "int", value: -100n });
		expect(decodeCbor(bytes("3bffffffffffffffff"))).toEqual({
			kind: "int",
			value: -18446744073709551616n,
		});
	});

	it("decodes half-, single-, and double-precision floats to the same value", () => {
		expect(decodeCbor(bytes("f93e00"))).toEqual({ kind: "float", value: 1.5 });
		expect(decodeCbor(bytes("fa3fc00000"))).toEqual({
			kind: "float",
			value: 1.5,
		});
		expect(decodeCbor(bytes("fb3ff8000000000000"))).toEqual({
			kind: "float",
			value: 1.5,
		});
	});

	it("decodes non-finite floats at every precision (RFC 8949 Appendix A)", () => {
		expect(decodeCbor(bytes("f97c00"))).toEqual({
			kind: "float",
			value: Infinity,
		});
		expect(decodeCbor(bytes("fa7f800000"))).toEqual({
			kind: "float",
			value: Infinity,
		});
		expect(decodeCbor(bytes("fb7ff0000000000000"))).toEqual({
			kind: "float",
			value: Infinity,
		});
		expect(decodeCbor(bytes("f9fc00"))).toEqual({
			kind: "float",
			value: -Infinity,
		});
		const nanResult = decodeCbor(bytes("f97e00"));
		expect(nanResult.kind).toBe("float");
		expect(Number.isNaN((nanResult as { value: number }).value)).toBe(true);
	});

	it("decodes byte strings and text strings, definite-length (RFC 8949 Appendix A)", () => {
		expect(decodeCbor(bytes("40"))).toEqual({
			kind: "bytes",
			value: new Uint8Array(),
		});
		expect(decodeCbor(bytes("4401020304"))).toEqual({
			kind: "bytes",
			value: Uint8Array.fromHex("01020304"),
		});
		expect(decodeCbor(bytes("6449455446"))).toEqual({
			kind: "text",
			value: "IETF",
		});
		expect(decodeCbor(bytes("62225c"))).toEqual({ kind: "text", value: '"\\' });
	});

	it("decodes indefinite-length byte strings by concatenating chunks (RFC 8949 §3.2.3)", () => {
		expect(decodeCbor(bytes("5f42010243030405ff"))).toEqual({
			kind: "bytes",
			value: Uint8Array.fromHex("0102030405"),
		});
	});

	it("decodes indefinite-length text strings by concatenating chunks (RFC 8949 Appendix A)", () => {
		expect(decodeCbor(bytes("7f657374726561646d696e67ff"))).toEqual({
			kind: "text",
			value: "streaming",
		});
	});

	it("decodes arrays and maps, definite-length (RFC 8949 Appendix A)", () => {
		expect(decodeCbor(bytes("80"))).toEqual({ kind: "array", items: [] });
		expect(decodeCbor(bytes("83010203"))).toEqual({
			kind: "array",
			items: [1n, 2n, 3n].map((value) => ({ kind: "int", value })),
		});
		expect(decodeCbor(bytes("8301820203820405"))).toEqual({
			kind: "array",
			items: [
				{ kind: "int", value: 1n },
				{
					kind: "array",
					items: [
						{ kind: "int", value: 2n },
						{ kind: "int", value: 3n },
					],
				},
				{
					kind: "array",
					items: [
						{ kind: "int", value: 4n },
						{ kind: "int", value: 5n },
					],
				},
			],
		});
		expect(decodeCbor(bytes("a0"))).toEqual({ kind: "map", entries: [] });
		expect(decodeCbor(bytes("a201020304"))).toEqual({
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

	it("decodes indefinite-length arrays and maps (RFC 8949 Appendix A)", () => {
		expect(decodeCbor(bytes("9fff"))).toEqual({ kind: "array", items: [] });
		expect(decodeCbor(bytes("9f018202039f0405ffff"))).toEqual({
			kind: "array",
			items: [
				{ kind: "int", value: 1n },
				{
					kind: "array",
					items: [
						{ kind: "int", value: 2n },
						{ kind: "int", value: 3n },
					],
				},
				{
					kind: "array",
					items: [
						{ kind: "int", value: 4n },
						{ kind: "int", value: 5n },
					],
				},
			],
		});
		expect(decodeCbor(bytes("bf6346756ef563416d7421ff"))).toEqual({
			kind: "map",
			entries: [
				[
					{ kind: "text", value: "Fun" },
					{ kind: "bool", value: true },
				],
				[
					{ kind: "text", value: "Amt" },
					{ kind: "int", value: -2n },
				],
			],
		});
	});

	it("decodes tags (RFC 8949 Appendix A)", () => {
		expect(decodeCbor(bytes("c11a514b67b0"))).toEqual({
			kind: "tag",
			tag: 1n,
			value: { kind: "int", value: 1363896240n },
		});
		expect(
			decodeCbor(bytes("c074323031332d30332d32315432303a30343a30305a")),
		).toEqual({
			kind: "tag",
			tag: 0n,
			value: { kind: "text", value: "2013-03-21T20:04:00Z" },
		});
	});

	it("decodes booleans, null, undefined, and simple values (RFC 8949 Appendix A)", () => {
		expect(decodeCbor(bytes("f4"))).toEqual({ kind: "bool", value: false });
		expect(decodeCbor(bytes("f5"))).toEqual({ kind: "bool", value: true });
		expect(decodeCbor(bytes("f6"))).toEqual({ kind: "null" });
		expect(decodeCbor(bytes("f7"))).toEqual({ kind: "undefined" });
		expect(decodeCbor(bytes("f0"))).toEqual({ kind: "simple", value: 16 });
		expect(decodeCbor(bytes("f8ff"))).toEqual({ kind: "simple", value: 255 });
	});

	it("throws CborDecodeError for a reserved additional information value", () => {
		expect(() => decodeCbor(bytes("1c"))).toThrow(CborDecodeError);
	});

	it("throws CborDecodeError for a two-byte simple value below 32", () => {
		expect(() => decodeCbor(bytes("f800"))).toThrow(CborDecodeError);
	});

	it("throws CborDecodeError for trailing bytes after a complete item", () => {
		expect(() => decodeCbor(bytes("0000"))).toThrow(CborDecodeError);
	});

	it("throws CborDecodeError for a truncated top-level decode", () => {
		expect(() => decodeCbor(bytes("18"))).toThrow(CborDecodeError);
	});
});

describe("decodeCborItem", () => {
	it("reports incomplete for a truncated item", () => {
		expect(decodeCborItem(bytes("18"))).toEqual({ status: "incomplete" });
		expect(decodeCborItem(bytes("830102"))).toEqual({ status: "incomplete" });
	});

	it("reports the exact number of bytes consumed, ignoring trailing bytes", () => {
		const result = decodeCborItem(bytes("0100"));
		expect(result).toMatchObject({ status: "item", consumed: 1 });
	});

	it("decodes starting at a given offset", () => {
		const result = decodeCborItem(bytes("ff0100"), 1);
		expect(result).toMatchObject({
			status: "item",
			value: { kind: "int", value: 1n },
			consumed: 1,
		});
	});
});

describe("CborItemDecoder", () => {
	it("decodeAll decodes multiple back-to-back items from one complete buffer", () => {
		const result = decodeAll(new CborItemDecoder(), bytes("0102")); // int 1, int 2

		expect(result.items.map((item) => item.value)).toEqual([
			{ kind: "int", value: 1n },
			{ kind: "int", value: 2n },
		]);
		expect(result.errors).toEqual([]);
		expect(result.truncated).toBe(false);
	});

	it("decodeAll reports truncated for a dangling incomplete item", () => {
		const result = decodeAll(new CborItemDecoder(), bytes("0118")); // int 1, then a truncated item

		expect(result.items.map((item) => item.value)).toEqual([
			{ kind: "int", value: 1n },
		]);
		expect(result.truncated).toBe(true);
	});

	it("DecodeStream decodes items split across chunk boundaries", async () => {
		const stream = new DecodeStream(new CborItemDecoder(), {
			buffer: new ByteAccumulator(1024),
		});
		const writer = stream.writable.getWriter();
		const full = bytes("0102"); // two items: int 1, int 2

		const reader = stream.readable.getReader();
		const values: DataValue[] = [];
		const reading = (async () => {
			for (;;) {
				const { done, value } = await reader.read();
				if (done) return;
				values.push(value);
			}
		})();

		// Split mid-item is impossible here (both items are 1 byte), so split
		// between items instead — the interesting case for a sequence decoder.
		await writer.write(full.slice(0, 1));
		await writer.write(full.slice(1));
		await writer.close();
		await reading;

		expect(values).toEqual([
			{ kind: "int", value: 1n },
			{ kind: "int", value: 2n },
		]);
	});

	it("DecodeStream holds back an incomplete item until enough bytes arrive", async () => {
		const stream = new DecodeStream(new CborItemDecoder(), {
			buffer: new ByteAccumulator(1024),
		});
		const writer = stream.writable.getWriter();
		const reader = stream.readable.getReader();
		const values: DataValue[] = [];
		const reading = (async () => {
			for (;;) {
				const { done, value } = await reader.read();
				if (done) return;
				values.push(value);
			}
		})();

		await writer.write(bytes("18")); // needs one more byte
		await writer.write(bytes("2a")); // completes to int 42
		await writer.close();
		await reading;

		expect(values).toEqual([{ kind: "int", value: 42n }]);
	});
});
