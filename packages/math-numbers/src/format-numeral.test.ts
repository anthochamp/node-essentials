import { describe, expect, it } from "vitest";

import { formatNumeral } from "./format-numeral.js";
import { DecimalNum } from "./num/decimal-num.js";
import { refillLocaleSkeleton } from "./refill-locale-skeleton.js";
import { resolveLocaleSkeleton } from "./resolve-locale-skeleton.js";

describe("resolveLocaleSkeleton", () => {
	it("recovers the separators", () => {
		expect(resolveLocaleSkeleton(new Intl.NumberFormat("en-US"))).toMatchObject(
			{ decimalSeparator: ".", groupSeparator: "," },
		);
		expect(resolveLocaleSkeleton(new Intl.NumberFormat("de-DE"))).toMatchObject(
			{ decimalSeparator: ",", groupSeparator: "." },
		);
	});

	it("recovers asymmetric grouping", () => {
		expect(
			resolveLocaleSkeleton(new Intl.NumberFormat("en-US")).groupSizes,
		).toEqual([3, 3]);
		expect(
			resolveLocaleSkeleton(new Intl.NumberFormat("en-IN")).groupSizes,
		).toEqual([3, 2]);
	});

	it("recovers the numbering system's digits", () => {
		const deva = resolveLocaleSkeleton(
			new Intl.NumberFormat("hi-IN", { numberingSystem: "deva" }),
		);

		expect(deva.digits.join("")).toBe("०१२३४५६७८९");
	});

	it("recovers the locale's grouping threshold", () => {
		expect(
			resolveLocaleSkeleton(new Intl.NumberFormat("pl-PL"))
				.minimumGroupingDigits,
		).toBe(2);
		expect(
			resolveLocaleSkeleton(new Intl.NumberFormat("en-US"))
				.minimumGroupingDigits,
		).toBe(1);
	});

	it("recovers the decoration around a percentage", () => {
		const turkish = resolveLocaleSkeleton(
			new Intl.NumberFormat("tr-TR", { style: "percent" }),
		);

		expect(turkish.prefix).toBe("%");
		expect(turkish.suffix).toBe("");
	});
});

describe("refillLocaleSkeleton", () => {
	it("reproduces what Intl itself would print", () => {
		for (const locale of ["en-US", "de-DE", "en-IN", "pl-PL", "fr-FR"]) {
			const formatter = new Intl.NumberFormat(locale, {
				maximumFractionDigits: 3,
				minimumFractionDigits: 0,
			});
			const skeleton = resolveLocaleSkeleton(formatter);

			for (const numeral of [
				"1",
				"12",
				"1000",
				"10000",
				"1234567890123",
				"-1234567.5",
				"0.25",
			]) {
				expect(refillLocaleSkeleton(numeral, skeleton, "-")).toBe(
					formatter.format(numeral as Intl.StringNumericLiteral),
				);
			}
		}
	});
});

describe("formatNumeral past Intl's ceilings", () => {
	it("delegates to Intl while the request fits", () => {
		expect(formatNumeral("1234567.5", "en-US")).toBe(
			new Intl.NumberFormat("en-US").format("1234567.5"),
		);
	});

	it("honours more fraction digits than Intl will accept", () => {
		const numeral = `0.${"1".repeat(150)}`;

		expect(
			() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 150 }),
		).toThrow(RangeError);
		expect(
			formatNumeral(numeral as Intl.StringNumericLiteral, "en-US", {
				maximumFractionDigits: 150,
				minimumFractionDigits: 0,
			}),
		).toBe(numeral);
	});

	it("honours more significant digits than Intl will accept", () => {
		const value = DecimalNum.from(2).sqrtTo(34);

		expect(
			() => new Intl.NumberFormat("en-US", { maximumSignificantDigits: 34 }),
		).toThrow(RangeError);
		expect(value.format("en-US", { maximumSignificantDigits: 34 })).toBe(
			"1.414213562373095048801688724209698",
		);
	});

	it("groups a very long value the locale's own way", () => {
		const long = `${"1234567890".repeat(4)}.${"5".repeat(120)}`;

		expect(
			formatNumeral(long as Intl.StringNumericLiteral, "en-IN", {
				maximumFractionDigits: 120,
				minimumFractionDigits: 0,
			}).startsWith("1,23,45,67,89,01,23,45,67,89,01,23,45,67,89,012,34,56,7"),
		).toBe(false);
		expect(
			formatNumeral(long as Intl.StringNumericLiteral, "en-IN", {
				maximumFractionDigits: 120,
				minimumFractionDigits: 0,
			}).endsWith(`.${"5".repeat(120)}`),
		).toBe(true);
	});

	it("keeps the locale's own minus sign", () => {
		const numeral = `-0.${"7".repeat(120)}`;

		expect(
			formatNumeral(numeral as Intl.StringNumericLiteral, "en-US", {
				maximumFractionDigits: 120,
				minimumFractionDigits: 0,
			}),
		).toBe(numeral);
	});
});
