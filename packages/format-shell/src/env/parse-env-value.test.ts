import { expect, suite, test } from "vitest";

import {
	parseEnvValueAsBool,
	parseEnvValueAsNumber,
} from "./parse-env-value.js";

suite("parseEnvValueAsBool", () => {
	test("should read every flavor, case-insensitively", () => {
		expect(parseEnvValueAsBool("1")).toBe(true);
		expect(parseEnvValueAsBool("true")).toBe(true);
		expect(parseEnvValueAsBool("TRUE")).toBe(true);
		expect(parseEnvValueAsBool("yes")).toBe(true);
		expect(parseEnvValueAsBool("YES")).toBe(true);
		expect(parseEnvValueAsBool("on")).toBe(true);
		expect(parseEnvValueAsBool("0")).toBe(false);
		expect(parseEnvValueAsBool("false")).toBe(false);
		expect(parseEnvValueAsBool("FALSE")).toBe(false);
		expect(parseEnvValueAsBool("no")).toBe(false);
		expect(parseEnvValueAsBool("NO")).toBe(false);
		expect(parseEnvValueAsBool("off")).toBe(false);
	});

	test("should report a value spelling no boolean", () => {
		expect(parseEnvValueAsBool("unexpected")).toBe(null);
		expect(parseEnvValueAsBool("")).toBe(null);
		expect(parseEnvValueAsBool(null)).toBe(null);
		expect(parseEnvValueAsBool(undefined)).toBe(null);
	});
});

suite("parseEnvValueAsNumber", () => {
	test("should read a number, widening past the safe range", () => {
		expect(parseEnvValueAsNumber("42")).toBe(42);
		expect(parseEnvValueAsNumber("-3.14")).toBeCloseTo(-3.14, 2);
		expect(parseEnvValueAsNumber("9007199254740991")).toBe(9007199254740991);
		expect(parseEnvValueAsNumber("9007199254740992")).toBe(9007199254740992n);
	});

	test("should report a value spelling no number", () => {
		expect(parseEnvValueAsNumber("not a number")).toBe(null);
		expect(parseEnvValueAsNumber("")).toBe(null);
		expect(parseEnvValueAsNumber(null)).toBe(null);
		expect(parseEnvValueAsNumber(undefined)).toBe(null);
	});
});
