import { describe, expect, it } from "vitest";
import { jsonMakeBigIntReplacerFunction } from "./big-int.js";

describe("jsonMakeBigIntReplacerFunction", () => {
	const replacer = jsonMakeBigIntReplacerFunction();

	it("should convert BigInt within safe range to number", () => {
		const bigIntValue = BigInt(42);
		const result = replacer("key", bigIntValue);
		expect(result).toBe(42);
	});

	it("should convert BigInt outside safe range to string", () => {
		const bigIntValue = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1);
		const result = replacer("key", bigIntValue);
		expect(result).toBe(
			(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1)).toString(),
		);
	});

	it("should convert negative BigInt within safe range to number", () => {
		const bigIntValue = BigInt(-42);
		const result = replacer("key", bigIntValue);
		expect(result).toBe(-42);
	});

	it("should convert negative BigInt outside safe range to string", () => {
		const bigIntValue = BigInt(Number.MIN_SAFE_INTEGER) - BigInt(1);
		const result = replacer("key", bigIntValue);
		expect(result).toBe(
			(BigInt(Number.MIN_SAFE_INTEGER) - BigInt(1)).toString(),
		);
	});

	it("should leave non-BigInt values unchanged", () => {
		const value = "test";
		const result = replacer("key", value);
		expect(result).toBe(value);
	});
});
