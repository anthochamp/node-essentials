import { describe, expect, it } from "vitest";

import type { DataValue } from "../ast.js";
import { encodeCbor } from "./encoder.js";

function hex(value: DataValue): string {
	return encodeCbor(value).toHex();
}

describe("encodeCbor", () => {
	it("encodes unsigned integers with the shortest argument width (RFC 8949 Appendix A)", () => {
		expect(hex({ kind: "int", value: 0n })).toBe("00");
		expect(hex({ kind: "int", value: 1n })).toBe("01");
		expect(hex({ kind: "int", value: 10n })).toBe("0a");
		expect(hex({ kind: "int", value: 23n })).toBe("17");
		expect(hex({ kind: "int", value: 24n })).toBe("1818");
		expect(hex({ kind: "int", value: 25n })).toBe("1819");
		expect(hex({ kind: "int", value: 100n })).toBe("1864");
		expect(hex({ kind: "int", value: 1000n })).toBe("1903e8");
		expect(hex({ kind: "int", value: 1000000n })).toBe("1a000f4240");
		expect(hex({ kind: "int", value: 1000000000000n })).toBe(
			"1b000000e8d4a51000",
		);
		expect(hex({ kind: "int", value: 18446744073709551615n })).toBe(
			"1bffffffffffffffff",
		);
	});

	it("encodes negative integers (RFC 8949 Appendix A)", () => {
		expect(hex({ kind: "int", value: -1n })).toBe("20");
		expect(hex({ kind: "int", value: -10n })).toBe("29");
		expect(hex({ kind: "int", value: -100n })).toBe("3863");
		expect(hex({ kind: "int", value: -1000n })).toBe("3903e7");
	});

	it("throws when an integer's magnitude exceeds 2^64-1", () => {
		expect(() =>
			encodeCbor({ kind: "int", value: 18446744073709551616n }),
		).toThrow();
		expect(() =>
			encodeCbor({ kind: "int", value: -18446744073709551617n }),
		).toThrow();
	});

	it("always encodes float as double-precision (major type 7, ai 27)", () => {
		expect(hex({ kind: "float", value: 1.5 })).toBe("fb3ff8000000000000");
		expect(hex({ kind: "float", value: Infinity })).toBe("fb7ff0000000000000");
	});

	it("encodes byte strings and text strings (RFC 8949 Appendix A)", () => {
		expect(hex({ kind: "bytes", value: new Uint8Array() })).toBe("40");
		expect(hex({ kind: "bytes", value: Uint8Array.fromHex("01020304") })).toBe(
			"4401020304",
		);
		expect(hex({ kind: "text", value: "" })).toBe("60");
		expect(hex({ kind: "text", value: "a" })).toBe("6161");
		expect(hex({ kind: "text", value: "IETF" })).toBe("6449455446");
	});

	it("encodes arrays and maps (RFC 8949 Appendix A)", () => {
		expect(hex({ kind: "array", items: [] })).toBe("80");
		expect(
			hex({
				kind: "array",
				items: [1n, 2n, 3n].map((value) => ({ kind: "int", value }) as const),
			}),
		).toBe("83010203");
		expect(hex({ kind: "map", entries: [] })).toBe("a0");
		expect(
			hex({
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
			}),
		).toBe("a201020304");
	});

	it("encodes tags (RFC 8949 Appendix A)", () => {
		expect(
			hex({ kind: "tag", tag: 1n, value: { kind: "int", value: 1363896240n } }),
		).toBe("c11a514b67b0");
	});

	it("encodes booleans, null, and undefined (RFC 8949 Appendix A)", () => {
		expect(hex({ kind: "bool", value: false })).toBe("f4");
		expect(hex({ kind: "bool", value: true })).toBe("f5");
		expect(hex({ kind: "null" })).toBe("f6");
		expect(hex({ kind: "undefined" })).toBe("f7");
	});

	it("encodes simple values (RFC 8949 Appendix A)", () => {
		expect(hex({ kind: "simple", value: 16 })).toBe("f0");
		expect(hex({ kind: "simple", value: 255 })).toBe("f8ff");
	});

	it("throws for a simple value that collides with a named value (20-23)", () => {
		expect(() => encodeCbor({ kind: "simple", value: 20 })).toThrow();
	});
});
