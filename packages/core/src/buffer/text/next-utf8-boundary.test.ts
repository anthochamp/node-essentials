import { describe, expect, it } from "vitest";

import { encodeTextUtf8 } from "./encode-text.js";
import { nextUtf8Boundary } from "./next-utf8-boundary.js";

describe("nextUtf8Boundary", () => {
	it("should leave an offset already on a boundary alone", () => {
		const bytes = encodeTextUtf8("aé€"); // 1 + 2 + 3 bytes

		expect(nextUtf8Boundary(bytes, 0)).toBe(0);
		expect(nextUtf8Boundary(bytes, 1)).toBe(1);
		expect(nextUtf8Boundary(bytes, 3)).toBe(3);
	});

	it("should skip the continuation bytes of a two-byte sequence", () => {
		expect(nextUtf8Boundary(encodeTextUtf8("aé€"), 2)).toBe(3);
	});

	it("should skip the continuation bytes of a four-byte sequence", () => {
		const bytes = encodeTextUtf8("🎉");

		expect(nextUtf8Boundary(bytes, 1)).toBe(4);
		expect(nextUtf8Boundary(bytes, 3)).toBe(4);
	});

	it("should clamp an out-of-range offset", () => {
		const bytes = encodeTextUtf8("aé");

		expect(nextUtf8Boundary(bytes, -5)).toBe(0);
		expect(nextUtf8Boundary(bytes, 9)).toBe(bytes.length);
	});

	it("should stop at the end of a malformed continuation run", () => {
		expect(nextUtf8Boundary(new Uint8Array([0x80, 0x80, 0x80]), 0)).toBe(3);
	});
});
