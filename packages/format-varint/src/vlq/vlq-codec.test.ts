import { describe, expect, it } from "vitest";

import { bigVlqDecoder } from "./big-vlq-decoder.js";
import { bigVlqEncoder } from "./big-vlq-encoder.js";
import { vlqDecoder } from "./vlq-decoder.js";
import { vlqEncoder } from "./vlq-encoder.js";

const CONTEXT = { atEof: false, timedOut: false } as const;

describe("vlqDecoder", () => {
	it("should decode one value and report the bytes it consumed", () => {
		expect(
			vlqDecoder.decode(new Uint8Array([0x82, 0x2c, 0xff]), CONTEXT),
		).toStrictEqual({ status: "decoded", value: 300, consumed: 2 });
	});

	it("should report a truncated value as incomplete", () => {
		expect(vlqDecoder.decode(new Uint8Array([0x82]), CONTEXT)).toStrictEqual({
			status: "incomplete",
		});
	});

	it("should report an empty view as incomplete", () => {
		expect(vlqDecoder.decode(new Uint8Array(0), CONTEXT)).toStrictEqual({
			status: "incomplete",
		});
	});

	it("should be fatal on an overlong encoding", () => {
		expect(
			vlqDecoder.decode(new Uint8Array([0x80, 0x01]), CONTEXT).status,
		).toBe("fatal");
	});
});

describe("vlqEncoder", () => {
	it("should produce what the decoder reads back", () => {
		const encoded = vlqEncoder.encode(16_384) as Uint8Array;

		expect(vlqDecoder.decode(encoded, CONTEXT)).toStrictEqual({
			status: "decoded",
			value: 16_384,
			consumed: 3,
		});
	});
});

describe("bigVlqDecoder", () => {
	it("should decode one value and report the bytes it consumed", () => {
		expect(
			bigVlqDecoder.decode(new Uint8Array([0x82, 0x2c, 0xff]), CONTEXT),
		).toStrictEqual({ status: "decoded", value: 300n, consumed: 2 });
	});

	it("should report a truncated value as incomplete", () => {
		expect(bigVlqDecoder.decode(new Uint8Array([0x82]), CONTEXT)).toStrictEqual(
			{ status: "incomplete" },
		);
	});

	it("should be fatal on an overlong encoding", () => {
		expect(
			bigVlqDecoder.decode(new Uint8Array([0x80, 0x01]), CONTEXT).status,
		).toBe("fatal");
	});

	it("should decode a value no number could hold", () => {
		const huge = (1n << 200n) + 12_345n;
		const encoded = bigVlqEncoder.encode(huge) as Uint8Array;

		expect(bigVlqDecoder.decode(encoded, CONTEXT)).toStrictEqual({
			status: "decoded",
			value: huge,
			consumed: encoded.length,
		});
	});
});
