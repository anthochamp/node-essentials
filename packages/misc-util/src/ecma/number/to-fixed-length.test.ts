import { expect, suite, test } from "vitest";
import { toFixedLength } from "./to-fixed-length.js";

suite("toFixedLength", () => {
	test("should format numbers correctly with fixedFractionDigits=true", () => {
		expect(
			toFixedLength(0.012, 5, {
				maxFractionDigits: 2,
				fixedFractionDigits: true,
			}),
		).toBe("00.01");
		expect(
			toFixedLength(0.123, 5, {
				maxFractionDigits: 2,
				fixedFractionDigits: true,
			}),
		).toBe("00.12");
		expect(
			toFixedLength(1.234, 5, {
				maxFractionDigits: 2,
				fixedFractionDigits: true,
			}),
		).toBe("01.23");
		expect(
			toFixedLength(12.345, 5, {
				maxFractionDigits: 2,
				fixedFractionDigits: true,
			}),
		).toBe("12.35");
		expect(
			toFixedLength(123.456, 5, {
				maxFractionDigits: 2,
				fixedFractionDigits: true,
			}),
		).toBe("99.99");
		expect(
			toFixedLength(1234.567, 5, {
				maxFractionDigits: 2,
				fixedFractionDigits: true,
			}),
		).toBe("99.99");
		expect(
			toFixedLength(12345.678, 5, {
				maxFractionDigits: 2,
				fixedFractionDigits: true,
			}),
		).toBe("99.99");
		expect(
			toFixedLength(123456.789, 5, {
				maxFractionDigits: 2,
				fixedFractionDigits: true,
			}),
		).toBe("99.99");
	});

	test("should format numbers correctly with fixedFractionDigits=false", () => {
		expect(toFixedLength(0.012, 5, { maxFractionDigits: 2 })).toBe("00.01");
		expect(toFixedLength(0.123, 5, { maxFractionDigits: 2 })).toBe("00.12");
		expect(toFixedLength(1.234, 5, { maxFractionDigits: 2 })).toBe("01.23");
		expect(toFixedLength(12.345, 5, { maxFractionDigits: 2 })).toBe("12.35");
		expect(toFixedLength(123.456, 5, { maxFractionDigits: 2 })).toBe("123.5");
		expect(toFixedLength(1234.567, 5, { maxFractionDigits: 2 })).toBe("999.9");
		expect(toFixedLength(12345.678, 5, { maxFractionDigits: 2 })).toBe("12346");
		expect(toFixedLength(123456.789, 5, { maxFractionDigits: 2 })).toBe(
			"99999",
		);
	});

	test("should format numbers correctly with fixedLength=5, fractionDigits=3, fixedFractionDigits=false", () => {
		expect(toFixedLength(0.012, 5, { maxFractionDigits: 3 })).toBe("0.012");
		expect(toFixedLength(0.123, 5, { maxFractionDigits: 3 })).toBe("0.123");
		expect(toFixedLength(1.234, 5, { maxFractionDigits: 3 })).toBe("1.234");
		expect(toFixedLength(12.345, 5, { maxFractionDigits: 3 })).toBe("12.35");
		expect(toFixedLength(123.456, 5, { maxFractionDigits: 3 })).toBe("123.5");
		expect(toFixedLength(1234.567, 5, { maxFractionDigits: 3 })).toBe("999.9");
		expect(toFixedLength(12345.678, 5, { maxFractionDigits: 3 })).toBe("12346");
		expect(toFixedLength(123456.789, 5, { maxFractionDigits: 3 })).toBe(
			"99999",
		);
	});

	test("should format numbers correctly with fixedLength=6, fractionDigits=2, fixedFractionDigits=false", () => {
		expect(toFixedLength(0.012, 6, { maxFractionDigits: 2 })).toBe("000.01");
		expect(toFixedLength(0.123, 6, { maxFractionDigits: 2 })).toBe("000.12");
		expect(toFixedLength(1.234, 6, { maxFractionDigits: 2 })).toBe("001.23");
		expect(toFixedLength(12.345, 6, { maxFractionDigits: 2 })).toBe("012.35");
		expect(toFixedLength(123.456, 6, { maxFractionDigits: 2 })).toBe("123.46");
		expect(toFixedLength(1234.567, 6, { maxFractionDigits: 2 })).toBe("1234.6");
		expect(toFixedLength(12345.678, 6, { maxFractionDigits: 2 })).toBe(
			"9999.9",
		);
		expect(toFixedLength(123456.789, 6, { maxFractionDigits: 2 })).toBe(
			"123457",
		);
		expect(toFixedLength(1234567.891, 6, { maxFractionDigits: 2 })).toBe(
			"999999",
		);
	});
});
