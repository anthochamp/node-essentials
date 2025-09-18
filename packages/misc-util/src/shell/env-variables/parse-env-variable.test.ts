import { expect, suite, test } from "vitest";
import {
	parseEnvVariable,
	parseEnvVariableValue,
	parseEnvVariableValueAsBool,
	parseEnvVariableValueAsNumber,
	parseEnvVariableValueAsString,
} from "./parse-env-variable.js";

suite("parse-env-variable", () => {
	suite("parseEnvVariableValueAsBool", () => {
		test("should parse boolean values correctly", () => {
			expect(parseEnvVariableValueAsBool("1")).toBe(true);
			expect(parseEnvVariableValueAsBool("true")).toBe(true);
			expect(parseEnvVariableValueAsBool("TRUE")).toBe(true);
			expect(parseEnvVariableValueAsBool("yes")).toBe(true);
			expect(parseEnvVariableValueAsBool("YES")).toBe(true);
			expect(parseEnvVariableValueAsBool("0")).toBe(false);
			expect(parseEnvVariableValueAsBool("false")).toBe(false);
			expect(parseEnvVariableValueAsBool("FALSE")).toBe(false);
			expect(parseEnvVariableValueAsBool("no")).toBe(false);
			expect(parseEnvVariableValueAsBool("NO")).toBe(false);
			expect(parseEnvVariableValueAsBool("unexpected")).toBe(null);
			expect(parseEnvVariableValueAsBool("")).toBe(null);
			expect(parseEnvVariableValueAsBool(null)).toBe(null);
			expect(parseEnvVariableValueAsBool(undefined)).toBe(null);
		});
	});

	suite("parseEnvVariableValueAsNumber", () => {
		test("should parse number and bigint values correctly", () => {
			expect(parseEnvVariableValueAsNumber("42")).toBe(42);
			expect(parseEnvVariableValueAsNumber("-3.14")).toBeCloseTo(-3.14, 2);
			expect(parseEnvVariableValueAsNumber("9007199254741991")).toBe(
				9007199254741991n,
			);
			expect(parseEnvVariableValueAsNumber("9007199254741992")).toBe(
				9007199254741992n,
			);
			expect(parseEnvVariableValueAsNumber("not a number")).toBe(null);
			expect(parseEnvVariableValueAsNumber("")).toBe(null);
			expect(parseEnvVariableValueAsNumber(null)).toBe(null);
			expect(parseEnvVariableValueAsNumber(undefined)).toBe(null);
		});
	});

	suite("parseEnvVariableValueAsString", () => {
		test("should parse string values correctly", () => {
			expect(parseEnvVariableValueAsString("simple")).toBe("simple");
			expect(parseEnvVariableValueAsString("needs quoting")).toBe(
				"needs quoting",
			);
			expect(parseEnvVariableValueAsString('contains"quote')).toBe(
				'contains"quote',
			);
			expect(parseEnvVariableValueAsString("contains'singlequote")).toBe(
				"contains'singlequote",
			);
			expect(parseEnvVariableValueAsString("contains=equals")).toBe(
				"contains=equals",
			);
			expect(parseEnvVariableValueAsString("")).toBe(null);
			expect(parseEnvVariableValueAsString(null)).toBe(null);
			expect(parseEnvVariableValueAsString(undefined)).toBe(null);
		});
	});

	suite("parseEnvVariable", () => {
		test("should parse environment variable definitions correctly", () => {
			expect(parseEnvVariable("KEY1=simple")).toEqual({
				name: "KEY1",
				value: "simple",
			});
			expect(parseEnvVariable('KEY2="needs quoting"')).toEqual({
				name: "KEY2",
				value: "needs quoting",
			});
			expect(parseEnvVariable('KEY3="contains\\"quote"')).toEqual({
				name: "KEY3",
				value: 'contains"quote',
			});
			expect(parseEnvVariable("KEY4=contains'singlequote")).toEqual({
				name: "KEY4",
				value: "contains'singlequote",
			});
			expect(parseEnvVariable('KEY5="contains=equals"')).toEqual({
				name: "KEY5",
				value: "contains=equals",
			});
			expect(parseEnvVariable("KEY6=42")).toEqual({ name: "KEY6", value: 42 });
			expect(parseEnvVariable("KEY7=-3.14")).toEqual({
				name: "KEY7",
				value: -3.14,
			});
			expect(parseEnvVariable("KEY8=9007199254741991")).toEqual({
				name: "KEY8",
				value: 9007199254741991n,
			});
			expect(parseEnvVariable("KEY9=true")).toEqual({
				name: "KEY9",
				value: true,
			});
			expect(parseEnvVariable("KEY10=false")).toEqual({
				name: "KEY10",
				value: false,
			});
			expect(parseEnvVariable("KEY11=unexpected")).toEqual({
				name: "KEY11",
				value: "unexpected",
			});
			expect(parseEnvVariable("KEY12=")).toEqual({
				name: "KEY12",
				value: null,
			});
			expect(parseEnvVariable("KEY13")).toEqual({ name: "KEY13", value: null });
		});
	});

	suite("parseEnvVariableValue", () => {
		test("should parse environment variable values correctly", () => {
			expect(parseEnvVariableValue("simple")).toBe("simple");
			expect(parseEnvVariableValue("needs quoting")).toBe("needs quoting");
			expect(parseEnvVariableValue('contains"quote')).toBe('contains"quote');
			expect(parseEnvVariableValue("contains'singlequote")).toBe(
				"contains'singlequote",
			);
			expect(parseEnvVariableValue("contains=equals")).toBe("contains=equals");
			expect(parseEnvVariableValue("42")).toBe(42);
			expect(parseEnvVariableValue("-3.14")).toBeCloseTo(-3.14, 2);
			expect(parseEnvVariableValue("9007199254741991")).toBe(9007199254741991n);
			expect(parseEnvVariableValue("true")).toBe(true);
			expect(parseEnvVariableValue("false")).toBe(false);
			expect(parseEnvVariableValue("unexpected")).toBe("unexpected");
			expect(parseEnvVariableValue("")).toBe(null);
			expect(parseEnvVariableValue(null)).toBe(null);
			expect(parseEnvVariableValue(undefined)).toBe(null);
		});
	});
});
