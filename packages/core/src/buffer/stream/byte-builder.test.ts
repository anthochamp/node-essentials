import { describe, expect, it } from "vitest";

import { ByteBuilder } from "./byte-builder.js";

describe("ByteBuilder", () => {
	it("should return an empty array when nothing was written", () => {
		expect(new ByteBuilder().toBytes()).toHaveLength(0);
	});

	it("should track byteLength across writeByte and write", () => {
		const writer = new ByteBuilder();
		writer.writeByte(1);
		writer.write(new Uint8Array([2, 3, 4]));
		expect(writer.byteLength).toBe(4);
	});

	it("should concatenate every write, in order", () => {
		const writer = new ByteBuilder();
		writer.writeByte(0xff);
		writer.write(new Uint8Array([0x01, 0x02]));
		writer.writeByte(0x10);
		expect(Array.from(writer.toBytes())).toEqual([0xff, 0x01, 0x02, 0x10]);
	});

	it("should mask writeByte's argument to a single byte", () => {
		const writer = new ByteBuilder();
		writer.writeByte(0x1ff);
		expect(Array.from(writer.toBytes())).toEqual([0xff]);
	});

	it("should treat writing a zero-length array as a no-op", () => {
		const writer = new ByteBuilder();
		writer.write(new Uint8Array(0));
		expect(writer.byteLength).toBe(0);
		expect(writer.toBytes()).toHaveLength(0);
	});
});
