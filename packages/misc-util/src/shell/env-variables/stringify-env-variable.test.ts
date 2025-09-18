import { expect, suite, test } from "vitest";
import { stringifyEnvVariable } from "./stringify-env-variable.js";

suite("stringifyEnvVariable", () => {
	test("should stringify values correctly", () => {
		expect(stringifyEnvVariable("KEY1", "simple")).toBe("KEY1=simple");
		expect(stringifyEnvVariable("KEY2", "needs quoting")).toBe(
			'KEY2="needs quoting"',
		);
		expect(stringifyEnvVariable("KEY3", 42)).toBe("KEY3=42");
		expect(stringifyEnvVariable("KEY4", true)).toBe("KEY4=1");
		expect(stringifyEnvVariable("KEY5", null)).toBe("KEY5=");
	});

	test("should stringify string values correctly", () => {
		expect(stringifyEnvVariable("KEY1", "simple")).toBe("KEY1=simple");
		expect(stringifyEnvVariable("KEY2", "needs quoting")).toBe(
			'KEY2="needs quoting"',
		);
		expect(stringifyEnvVariable("KEY3", 'contains"quote')).toBe(
			'KEY3="contains\\"quote"',
		);
		expect(stringifyEnvVariable("KEY4", "contains'singlequote")).toBe(
			'KEY4="contains\'singlequote"',
		);
		expect(stringifyEnvVariable("KEY5", "contains=equals")).toBe(
			'KEY5="contains=equals"',
		);
	});

	test("should stringify number and bigint values correctly", () => {
		expect(stringifyEnvVariable("KEY1", 42)).toBe("KEY1=42");
		expect(stringifyEnvVariable("KEY2", -3.14)).toBe("KEY2=-3.14");
		expect(stringifyEnvVariable("KEY3", 9007199254741991n)).toBe(
			"KEY3=9007199254741991",
		);
	});

	test("should stringify boolean values correctly with default flavor", () => {
		expect(stringifyEnvVariable("KEY1", true)).toBe("KEY1=1");
		expect(stringifyEnvVariable("KEY2", false)).toBe("KEY2=0");
	});

	test("should stringify boolean values correctly with 'true/false' flavor", () => {
		expect(
			stringifyEnvVariable("KEY1", true, { boolFlavor: "true/false" }),
		).toBe("KEY1=true");
		expect(
			stringifyEnvVariable("KEY2", false, { boolFlavor: "true/false" }),
		).toBe("KEY2=false");
	});

	test("should stringify boolean values correctly with 'yes/no' flavor", () => {
		expect(stringifyEnvVariable("KEY1", true, { boolFlavor: "yes/no" })).toBe(
			"KEY1=yes",
		);
		expect(stringifyEnvVariable("KEY2", false, { boolFlavor: "yes/no" })).toBe(
			"KEY2=no",
		);
	});

	test("should stringify boolean values correctly with 'on/off' flavor", () => {
		expect(stringifyEnvVariable("KEY1", true, { boolFlavor: "on/off" })).toBe(
			"KEY1=on",
		);
		expect(stringifyEnvVariable("KEY2", false, { boolFlavor: "on/off" })).toBe(
			"KEY2=off",
		);
	});

	test("should stringify null values correctly", () => {
		expect(stringifyEnvVariable("KEY1", null)).toBe("KEY1=");
	});
});
