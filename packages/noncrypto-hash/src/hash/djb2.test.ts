import { encodeTextUtf8 } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { djb2, djb2a } from "./djb2.js";

const PANGRAM = "The quick brown fox jumps over the lazy dog";

describe("djb2", () => {
	it("should return the offset basis for empty input", () => {
		expect(djb2(encodeTextUtf8(""))).toBe(5381);
	});

	it("should apply the additive round", () => {
		expect(djb2(encodeTextUtf8("a"))).toBe(5381 * 33 + 97);
	});

	it("should accept a custom seed", () => {
		expect(djb2(encodeTextUtf8(""), 7)).toBe(7);
	});
});

describe("djb2a", () => {
	it("should return the offset basis for empty input", () => {
		expect(djb2a(encodeTextUtf8(""))).toBe(5381);
	});

	it("should apply the XOR round", () => {
		expect(djb2a(encodeTextUtf8("a"))).toBe((5381 * 33) ^ 97);
	});

	it("should differ from djb2 on non-empty input", () => {
		expect(djb2a(encodeTextUtf8(PANGRAM))).not.toBe(
			djb2(encodeTextUtf8(PANGRAM)),
		);
	});
});
